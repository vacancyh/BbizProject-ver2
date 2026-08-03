/**
 * 알림 모듈 서비스 — 2026-08-03 신설
 *
 *  - notify(event, recipient, vars, meta)  = 템플릿 조회 → 변수 치환 → 발송 → 기록
 *  - listTemplates / upsertTemplate        = 관리자 문구 편집
 *  - seedDefaults()                        = 기본 템플릿 최초 1회 적재
 *  - listLogs                              = 발송 이력(CS 응대용)
 *
 * 원칙: **알림 실패가 주문 흐름을 막지 않는다.** 모든 실패는 기록하고 흡수한다.
 *       문자 한 통 못 보낸 것 때문에 주문이 취소되면 훨씬 큰 손해다.
 */
import { MedusaService } from "@medusajs/framework/utils"
import NotificationTemplate from "./models/notification-template"
import NotificationLog from "./models/notification-log"
import {
  renderTemplate,
  isValidRecipient,
  checkLength,
  DEFAULT_TEMPLATES,
} from "./logic"
import { resolveProvider, type NotificationChannel } from "./provider"

export type NotifyMeta = {
  order_id?: string | null
  customer_id?: string | null
  /** 기본 채널은 sms. 이메일 알림을 쓰려면 명시한다. */
  channel?: NotificationChannel
}

class NotificationKrModuleService extends MedusaService({
  NotificationTemplate,
  NotificationLog,
}) {
  /**
   * 알림 1건 발송.
   * 실패해도 예외를 던지지 않는다 — 호출부(주문 흐름)를 막지 않기 위해서다.
   * 대신 무슨 일이 있었는지는 반드시 notification_log 에 남는다.
   */
  async notify(
    event: string,
    recipient: string,
    vars: Record<string, unknown> = {},
    meta: NotifyMeta = {}
  ): Promise<{ status: string; reason?: string }> {
    const channel: NotificationChannel = meta.channel ?? "sms"

    const write = async (
      status: string,
      body: string,
      title: string | null,
      error?: string
    ) => {
      try {
        await this.createNotificationLogs([
          {
            event,
            channel,
            recipient,
            title,
            body,
            status,
            error: error ?? null,
            order_id: meta.order_id ?? null,
            customer_id: meta.customer_id ?? null,
          },
        ])
      } catch {
        // 기록조차 실패하면 더 할 수 있는 게 없다. 흐름은 막지 않는다.
      }
    }

    try {
      // 요청한 채널에 문구가 없으면 **다른 채널 문구로 폴백**한다.
      // (2026-08-03) 처음에는 폴백이 없어서, 전화번호가 없는 주문은 email 채널로 잡히고
      // email 문구가 없어 알림이 조용히 건너뛰어졌다. 조용한 누락이 가장 위험하다.
      // 문구는 채널과 무관하게 내용이 거의 같으므로 폴백해도 어색하지 않다.
      const all = await this.listNotificationTemplates({ event })
      const tpl =
        (all ?? []).find((t: any) => t.channel === channel) ?? (all ?? [])[0]
      if (!tpl) {
        await write("skipped", "", null, `템플릿 없음(event=${event})`)
        return { status: "skipped", reason: "템플릿 없음" }
      }
      if (!tpl.enabled) {
        await write("skipped", "", null, "템플릿 비활성")
        return { status: "skipped", reason: "템플릿 비활성" }
      }

      const { text, missing } = renderTemplate(String(tpl.body), vars)
      const title = tpl.title
        ? renderTemplate(String(tpl.title), vars).text
        : null

      if (!isValidRecipient(channel, recipient)) {
        // 형식이 틀린 곳으로 보내면 과금만 되고 도달하지 않는다.
        await write("failed", text, title, `수신처 형식 오류: ${channel}`)
        return { status: "failed", reason: "수신처 형식 오류" }
      }

      const len = checkLength(channel, text)
      if (!len.ok) {
        await write("failed", text, title, `본문 길이 초과(${len.bytes}바이트)`)
        return { status: "failed", reason: "본문 길이 초과" }
      }

      const provider = resolveProvider()
      const res = await provider.send({ channel, to: recipient, title, body: text })

      // 변수가 비어 있으면 문구에 {{key}} 가 그대로 남는다 — 운영자가 알아채도록 사유에 남긴다.
      const note = missing.length ? `미치환 변수: ${missing.join(", ")}` : undefined
      await write(res.status, text, title, res.error ?? note)
      return { status: res.status, reason: res.error ?? note }
    } catch (e) {
      await write("failed", "", null, (e as Error)?.message?.slice(0, 200))
      return { status: "failed", reason: (e as Error)?.message }
    }
  }

  /** 기본 템플릿 적재 — 이미 있으면 건드리지 않는다(운영자가 고친 문구를 덮어쓰지 않기 위해). */
  async seedDefaults(): Promise<{ created: number; skipped: number }> {
    let created = 0
    let skipped = 0
    for (const t of DEFAULT_TEMPLATES) {
      const exists = await this.listNotificationTemplates({
        event: t.event,
        channel: t.channel,
      })
      if (exists?.length) {
        skipped++
        continue
      }
      await this.createNotificationTemplates([t])
      created++
    }
    return { created, skipped }
  }

  /** 관리자 목록 — event, channel 순 정렬 */
  async listAllTemplates(): Promise<any[]> {
    const rows = await this.listNotificationTemplates({})
    return [...(rows ?? [])].sort((a: any, b: any) =>
      a.event === b.event
        ? String(a.channel).localeCompare(String(b.channel))
        : String(a.event).localeCompare(String(b.event))
    )
  }

  /** 발송 이력 — 최신순 */
  async listRecentLogs(limit = 100, filters: Record<string, unknown> = {}): Promise<any[]> {
    const rows = await this.listNotificationLogs(filters, {
      order: { created_at: "DESC" },
      take: Math.min(Math.max(1, limit), 500),
    })
    return rows ?? []
  }
}

export default NotificationKrModuleService
