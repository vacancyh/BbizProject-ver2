/**
 * 알림 문구 템플릿 Admin API — 2026-08-03 신설
 *
 *   GET  /admin/notifications/templates            문구 목록 + 사용 가능한 변수 안내
 *   POST /admin/notifications/templates            문구 수정/추가 (id 있으면 수정)
 *   POST /admin/notifications/templates?seed=true  기본 문구 최초 적재
 *
 * 왜 관리자에서 고칠 수 있어야 하나: 알림 문구는 운영하면서 계속 바뀐다.
 * 코드에 박아 두면 "배송이 시작되었습니다" 한 줄 고치는 데 배포가 필요하다.
 *
 * 권한: RBAC `settings` 메뉴.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NOTIFICATION_KR_MODULE } from "../../../../modules/notification-kr"
import type NotificationKrModuleService from "../../../../modules/notification-kr/service"
import { NOTIFICATION_EVENTS } from "../../../../modules/notification-kr/logic"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(
    NOTIFICATION_KR_MODULE
  ) as unknown as NotificationKrModuleService
  const templates = await svc.listAllTemplates()
  res.json({
    templates,
    /** 어떤 알림 시점이 있는지 — 관리자 화면 안내용 */
    events: NOTIFICATION_EVENTS,
    /** 현재 발송 방식. "log" 면 실제 문자는 나가지 않고 기록만 된다. */
    provider: process.env.NOTIFICATION_PROVIDER ?? "log",
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(
    NOTIFICATION_KR_MODULE
  ) as unknown as NotificationKrModuleService

  // 기본 문구 적재 — 이미 있는 것은 건드리지 않는다(운영자가 고친 문구 보호).
  if (String((req.query as any)?.seed) === "true") {
    const r = await svc.seedDefaults()
    res.json({ seeded: true, ...r })
    return
  }

  const body = (req.body ?? {}) as {
    id?: string
    event?: string
    channel?: string
    name?: string
    title?: string | null
    body?: string
    variables?: string | null
    enabled?: boolean
  }

  if (body.id) {
    if (typeof body.body === "string" && !body.body.trim()) {
      res.status(400).json({ message: "본문은 비워 둘 수 없습니다." })
      return
    }
    const update: Record<string, unknown> = { id: body.id }
    for (const k of ["name", "title", "body", "variables", "enabled"] as const) {
      if (body[k] !== undefined) update[k] = body[k]
    }
    const [row] = await svc.updateNotificationTemplates([update as any])
    res.json({ template: row })
    return
  }

  if (!body.event || !body.channel || !body.body) {
    res.status(400).json({ message: "event, channel, body 는 필수입니다." })
    return
  }
  const [row] = await svc.createNotificationTemplates([
    {
      event: body.event,
      channel: body.channel,
      name: body.name ?? body.event,
      title: body.title ?? null,
      body: body.body,
      variables: body.variables ?? null,
      enabled: body.enabled ?? true,
    } as any,
  ])
  res.status(201).json({ template: row })
}
