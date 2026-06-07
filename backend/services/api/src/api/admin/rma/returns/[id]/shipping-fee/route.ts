/**
 * 반품 배송비 부담주체 산출 Admin API (전자상거래법 §17 ② 래핑)
 *
 *  - POST /admin/rma/returns/:id/shipping-fee   { reason }
 *      반품 사유(CUSTOMER_CHANGE_OF_MIND / PRODUCT_DEFECT / WRONG_DELIVERY / OTHER)에 따라
 *      배송비 부담 주체(CUSTOMER / SELLER)와 금액(null=실배송비)을 산출.
 *
 * 로직 재구현 X — 모듈 서비스 호출/래핑. 권한검사는 미들웨어(/admin 인증).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RMA_EXTENSION_MODULE } from "../../../../../../modules/rma-extension"
import RmaExtensionModuleService from "../../../../../../modules/rma-extension/service"
import {
  RETURN_REASONS,
  ReturnReasonValue,
} from "../../../../../../modules/rma-extension/models/return-shipping-fee-policy"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { reason?: ReturnReasonValue }
  const orderReturnId = req.params.id

  if (!body.reason || !RETURN_REASONS.includes(body.reason)) {
    res.status(400).json({
      message: `반품 사유(reason)는 ${RETURN_REASONS.join(" / ")} 중 하나여야 합니다.`,
    })
    return
  }

  const svc = req.scope.resolve(
    RMA_EXTENSION_MODULE
  ) as unknown as RmaExtensionModuleService

  const result = await svc.assignShippingFee(orderReturnId, body.reason)

  res.json({ reason: body.reason, payer: result.payer, amount: result.amount })
}
