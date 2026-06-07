/**
 * 환불 방식 지정 Admin API (RMA Extension 모듈 래핑)
 *
 *  - POST /admin/rma/returns/:id/reimbursement   { type }
 *      ① type(REFUND / STORE_CREDIT / EXCHANGE / REPLACEMENT) 검증
 *      ② calculateReimbursement 로 금액 산출(기존 레코드 우선)
 *      ③ ReimbursementMethod 레코드 생성(상태 PENDING) → order_return 과 link
 *
 * 로직 재구현 X — 모듈 서비스 호출/래핑. 권한검사는 미들웨어(/admin 인증).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RMA_EXTENSION_MODULE } from "../../../../../../modules/rma-extension"
import RmaExtensionModuleService from "../../../../../../modules/rma-extension/service"
import {
  REIMBURSEMENT_TYPES,
  ReimbursementTypeValue,
} from "../../../../../../modules/rma-extension/models/reimbursement-type"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { type?: ReimbursementTypeValue }
  const orderReturnId = req.params.id

  if (!body.type || !REIMBURSEMENT_TYPES.includes(body.type)) {
    res.status(400).json({
      message: `환불 방식(type)은 ${REIMBURSEMENT_TYPES.join(" / ")} 중 하나여야 합니다.`,
    })
    return
  }

  const svc = req.scope.resolve(
    RMA_EXTENSION_MODULE
  ) as unknown as RmaExtensionModuleService

  // ② 금액 산출(기존 레코드 있으면 그 금액, 없으면 0)
  const calc = await svc.calculateReimbursement(orderReturnId, body.type)

  // ③ 환불 방식 레코드 생성(PENDING)
  const [reimbursement] = await svc.createReimbursementMethods([
    {
      order_return_id: orderReturnId,
      type: body.type,
      amount: calc.amount,
      status: "PENDING",
    },
  ])

  res.json({ reimbursement })
}
