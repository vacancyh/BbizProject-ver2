/**
 * 반품 검수 등록 Admin API (RMA Extension 모듈 래핑)
 *
 *  - POST /admin/rma/returns/:id/inspection   { resellable, condition, notes?, inspector_id? }
 *      반품 수령 후 검수 결과(재판매 가능 여부 · 상태등급 A/B/C/DISPOSE)를 기록.
 *      검수 시각(inspected_at)은 서버 현재 시각으로 기록.
 *
 * 로직 재구현 X — 모듈 서비스 호출/래핑. 권한검사는 미들웨어(/admin 인증).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RMA_EXTENSION_MODULE } from "../../../../../../modules/rma-extension"
import RmaExtensionModuleService from "../../../../../../modules/rma-extension/service"
import {
  RETURN_CONDITIONS,
  ReturnConditionValue,
} from "../../../../../../modules/rma-extension/models/return-inspection"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as {
    resellable?: boolean
    condition?: ReturnConditionValue
    notes?: string
    inspector_id?: string
  }
  const orderReturnId = req.params.id

  if (body.condition && !RETURN_CONDITIONS.includes(body.condition)) {
    res.status(400).json({
      message: `상태 등급(condition)은 ${RETURN_CONDITIONS.join(" / ")} 중 하나여야 합니다.`,
    })
    return
  }

  const actorId = (req as any).auth_context?.actor_id ?? null
  const svc = req.scope.resolve(
    RMA_EXTENSION_MODULE
  ) as unknown as RmaExtensionModuleService

  const [inspection] = await svc.createReturnInspections([
    {
      order_return_id: orderReturnId,
      resellable: body.resellable ?? true,
      condition: body.condition ?? "A_GRADE",
      inspector_id: body.inspector_id ?? actorId,
      notes: body.notes ?? null,
      inspected_at: new Date(),
    },
  ])

  res.json({ inspection })
}
