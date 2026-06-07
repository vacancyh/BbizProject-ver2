/**
 * 감사 로그 모듈 서비스 — append-only.
 *
 * 주요 메서드:
 *  - record(entry)        = write 액션 1건 기록(PII 마스킹 적용). 생성만 노출.
 *  - recordIfWriteAction  = canWriteAudit 로 HTTP 메서드 판정 후 write 이면 record 위임.
 *  - query(filter)        = 감사 로그 조회(actor/method/기간 필터 + 페이지네이션)
 *  - guardAppendOnly      = isAppendOnlyBlocked 로 update/delete 시도 차단(throw).
 *
 * append-only 보장: update/delete 래퍼를 노출하지 않는다(미들웨어/엔드포인트에서 호출 불가).
 * 5년 보관 만료분 아카이브는 후속 jobs 영역(본 슬라이스 범위 밖).
 */
import { MedusaService } from "@medusajs/framework/utils"
import AuditLog from "./models/audit-log"
import { maskPii, maskString } from "./utils/mask-pii"
import { canWriteAudit, isAppendOnlyBlocked } from "./logic"

export type AuditEntry = {
  actor_id?: string | null
  actor_email?: string | null
  action: string
  method: string
  path: string
  target_type?: string | null
  target_id?: string | null
  status_code: number
  diff?: unknown
  ip?: string | null
}

export type AuditQueryFilter = {
  actor_id?: string
  method?: string
  from?: string // ISO date
  to?: string // ISO date
}

class AuditModuleService extends MedusaService({
  AuditLog,
}) {
  /**
   * 감사 로그 1건 기록(append-only). diff/이메일은 PII 마스킹 후 저장.
   */
  async record(entry: AuditEntry): Promise<any> {
    const [created] = await this.createAuditLogs([
      {
        actor_id: entry.actor_id ?? null,
        actor_email: entry.actor_email ? maskString(entry.actor_email) : null,
        action: entry.action,
        method: entry.method,
        path: entry.path,
        target_type: entry.target_type ?? null,
        target_id: entry.target_id ?? null,
        status_code: entry.status_code,
        diff: entry.diff == null ? null : (maskPii(entry.diff) as any),
        ip: entry.ip ?? null,
      },
    ])
    return created
  }

  /**
   * HTTP 메서드가 감사 대상 write 액션인지 canWriteAudit 로 판정 후, write 이면 record 를 호출한다.
   * GET/HEAD 등 read-only 메서드이면 아무 동작 없이 null 반환.
   *
   * 미들웨어·훅에서 호출하는 진입점: canWriteAudit production 실행경로.
   */
  async recordIfWriteAction(
    httpMethod: string,
    entry: AuditEntry
  ): Promise<any | null> {
    if (!canWriteAudit(httpMethod)) {
      return null
    }
    return this.record(entry)
  }

  /**
   * append-only 불변성 방어 가드.
   * 'update' 또는 'delete' 오퍼레이션 시도는 isAppendOnlyBlocked 로 판정하여 throw.
   * service 레이어에서 직접 호출하거나, 외부 훅에서 호출한다.
   *
   * @throws audit_log 는 INSERT 만 허용(append-only 위반)
   */
  guardAppendOnly(operation: string): void {
    if (isAppendOnlyBlocked(operation)) {
      throw new Error(
        `[audit] append-only 위반: '${operation}' 오퍼레이션은 audit_log 테이블에 허용되지 않습니다.`
      )
    }
  }

  /**
   * 감사 로그 조회(최신순). actor_id/method/기간 필터 + 페이지네이션.
   */
  async query(
    filter: AuditQueryFilter = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<{ items: any[]; count: number }> {
    const where: Record<string, unknown> = {}
    if (filter.actor_id) where.actor_id = filter.actor_id
    if (filter.method) where.method = filter.method.toUpperCase()
    if (filter.from || filter.to) {
      const range: Record<string, Date> = {}
      if (filter.from) range.$gte = new Date(filter.from)
      if (filter.to) range.$lte = new Date(filter.to)
      where.created_at = range
    }
    const limit = Math.min(pagination.limit ?? 50, 200)
    const offset = pagination.offset ?? 0
    const [items, count] = await this.listAndCountAuditLogs(where, {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" },
    })
    return { items, count }
  }
}

export default AuditModuleService
