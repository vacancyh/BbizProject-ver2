/**
 * GET /admin/ops/health — 인프라 헬스 조회 (t009 API1)
 *
 * DB/Redis 접속 probe 후 resolveHealthStatus 판정 결과를 반환한다.
 * overall="up" = 200, "down" = 503.
 *
 * probe 구현:
 *  - DB: OpsModuleService.listMaintenanceStates({}) 성공 여부 (MedusaService DB 접속 확인)
 *  - Redis: Medusa 내부 캐싱 없이 IN-PROCESS 단순 true (Redis probe 는 infra 레벨)
 *    → 테스트에서 probe를 교체 가능하도록 checkHealth 콜백 주입 방식 사용.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OPS_MODULE } from "../../../../modules/ops"
import OpsModuleService from "../../../../modules/ops/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ops = req.scope.resolve(OPS_MODULE) as unknown as OpsModuleService

  // DB probe: listMaintenanceStates 성공 여부
  const dbFn = async (): Promise<boolean> => {
    await ops.listMaintenanceStates({})
    return true
  }

  // Redis probe: 현재 스택에서 분리된 인프라 레벨 — 기본 true 반환(운영 시 확장)
  const redisFn = async (): Promise<boolean> => true

  // checkHealth → resolveHealthStatus (production 실행경로)
  const status = await ops.checkHealth(dbFn, redisFn)

  res.status(status.httpCode).json({
    db: status.db,
    redis: status.redis,
    overall: status.overall,
  })
}
