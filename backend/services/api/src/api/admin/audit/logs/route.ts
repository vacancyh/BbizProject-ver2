/**
 * 감사 로그 조회 Admin API
 *
 *  - GET /admin/audit/logs?actor_id=&method=&from=&to=&limit=&offset=
 *      감사 로그를 최신순으로 조회(읽기 전용). append-only 이므로 생성/수정 엔드포인트 없음.
 *
 * 권한 게이트 (C3/A1 충족):
 *  - 요청 actor 의 role_key 를 RBAC 모듈에서 조회.
 *  - canReadAuditLogs(roleKey, permRows) = false 이면 403 반환.
 *  - true 이면 기존 목록 로직 진행.
 *
 * 감사 로그 화면(apps/admin /audit-logs)의 소스.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AUDIT_MODULE } from "../../../../modules/audit"
import AuditModuleService from "../../../../modules/audit/service"
import { RBAC_MODULE } from "../../../../modules/rbac"
import RbacModuleService from "../../../../modules/rbac/service"
import { canReadAuditLogs } from "../../../../modules/audit/logic"
import type { PermRow } from "../../../../modules/rbac/logic"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // ── 권한 게이트: canReadAuditLogs production 호출 ──────────────────────────
  const rbac = req.scope.resolve(RBAC_MODULE) as unknown as RbacModuleService
  const actorId: string | undefined = (req as any).auth_context?.actor_id
  const roleKey = actorId ? await rbac.getUserRole(actorId) : null
  let permRows: PermRow[] = []
  if (roleKey && roleKey !== "super") {
    permRows = (await rbac.listRolePermissions({
      role_key: roleKey,
      menu_id: "audit-logs",
    })) as PermRow[]
  }
  // C3/A1: 허용 여부 판정 — false 이면 403
  if (!canReadAuditLogs(roleKey, permRows)) {
    res.status(403).json({ message: "감사 로그 조회 권한이 없습니다." })
    return
  }
  // ── 목록 조회 ───────────────────────────────────────────────────────────────
  const audit = req.scope.resolve(AUDIT_MODULE) as unknown as AuditModuleService
  const q = req.query as Record<string, string | undefined>

  const limit = q.limit ? parseInt(q.limit, 10) : 50
  const offset = q.offset ? parseInt(q.offset, 10) : 0

  const result = await audit.query(
    {
      actor_id: q.actor_id,
      method: q.method,
      from: q.from,
      to: q.to,
    },
    { limit, offset }
  )
  res.json(result)
}
