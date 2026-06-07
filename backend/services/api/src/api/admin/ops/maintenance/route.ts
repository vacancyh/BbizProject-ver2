/**
 * GET  /admin/ops/maintenance — 점검모드 상태 조회 (t009 API1-b)
 * POST /admin/ops/maintenance — 점검모드 전환 (t009 API2)
 *
 * GET 응답: { maintenance_states: MaintenanceState[] }
 *  - ?scope=all|storefront|admin 으로 단건 조회 가능 (미지정 = 전체)
 *
 * POST 요청 바디: { scope: "all"|"storefront"|"admin", enabled: boolean, message?: string }
 *
 * 권한 게이트(POST):
 *  - RBAC 모듈에서 요청 actor의 role_key 조회.
 *  - canToggleMaintenance(roleKey) = false 이면 403 반환.
 *  - service.toggleMaintenance 내부에서도 이중 검증(defense-in-depth).
 *
 * 성공: 200 + 변경된 maintenance_state 반환.
 * 실패: 400(입력 오류) / 403(권한 없음).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OPS_MODULE } from "../../../../modules/ops"
import OpsModuleService from "../../../../modules/ops/service"
import { RBAC_MODULE } from "../../../../modules/rbac"
import RbacModuleService from "../../../../modules/rbac/service"
import { canToggleMaintenance } from "../../../../modules/ops/logic"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ops = req.scope.resolve(OPS_MODULE) as unknown as OpsModuleService
  const scope = req.query.scope as string | undefined
  const states = await ops.getMaintenanceState(scope)
  res.status(200).json({ maintenance_states: states })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // ── 권한 게이트: SUPER 전용 (canToggleMaintenance production 호출) ──────────
  const rbac = req.scope.resolve(RBAC_MODULE) as unknown as RbacModuleService
  const actorId: string | undefined = (req as any).auth_context?.actor_id
  const roleKey = actorId ? await rbac.getUserRole(actorId) : null

  // C1: canToggleMaintenance = false 이면 403
  if (!canToggleMaintenance(roleKey)) {
    res.status(403).json({ message: "점검모드 전환은 최고관리자(SUPER) 전용입니다." })
    return
  }

  // ── 요청 바디 파싱 ──────────────────────────────────────────────────────────
  const body = req.body as Record<string, unknown>
  const { scope, enabled, message } = body as {
    scope: string
    enabled: boolean
    message?: string
  }

  if (scope === undefined || enabled === undefined) {
    res.status(400).json({ message: "scope와 enabled는 필수입니다." })
    return
  }

  // ── 점검모드 전환 (service → logic 검증 위임) ──────────────────────────────
  const ops = req.scope.resolve(OPS_MODULE) as unknown as OpsModuleService
  try {
    const state = await ops.toggleMaintenance(
      scope,
      Boolean(enabled),
      typeof message === "string" ? message : undefined,
      roleKey
    )
    res.status(200).json({ maintenance_state: state })
  } catch (err) {
    const msg = (err as Error).message ?? "점검모드 전환 실패"
    const status = msg.includes("SUPER") ? 403 : 400
    res.status(status).json({ message: msg })
  }
}
