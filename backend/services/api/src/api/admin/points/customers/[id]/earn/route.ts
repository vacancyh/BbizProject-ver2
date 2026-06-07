/**
 * 고객 포인트 적립 Admin API
 *
 *  - POST /admin/points/customers/:id/earn
 *      body(둘 중 하나):
 *        { points: number, validDays?, reason? }                 — 직접 포인트 적립
 *        { amount: number, ratePercent: number, validDays?, reason? } — 구매금액×적립률 적립
 *      validDays 미지정 시 policy `point.expire_months` × 30 일 폴백.
 *
 * 자동 적립(주문완료 구독자)은 갭B 후속(deferred). 본 route 는 수동/명시 적립.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POLICY_MODULE } from "../../../../../../modules/policy"
import PolicyModuleService from "../../../../../../modules/policy/service"
import { CUSTOMER_POINT_MODULE } from "../../../../../../modules/customer-point"
import CustomerPointModuleService from "../../../../../../modules/customer-point/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const policy = req.scope.resolve(POLICY_MODULE) as unknown as PolicyModuleService
  const points = req.scope.resolve(CUSTOMER_POINT_MODULE) as unknown as CustomerPointModuleService
  const customerId = req.params.id
  const body = (req.body ?? {}) as {
    points?: number
    amount?: number
    ratePercent?: number
    validDays?: number
    reason?: string
  }

  // 유효기간 폴백: policy point.expire_months × 30
  let validDays = body.validDays
  if (typeof validDays !== "number" || validDays <= 0) {
    const row = await policy.get("point.expire_months")
    const months = typeof row?.value === "number" ? row.value : 12
    validDays = months * 30
  }
  const earnedAtIso = new Date().toISOString()

  try {
    let result: any
    if (typeof body.points === "number") {
      result = await points.earnPoints(customerId, body.points, {
        validDays,
        earnedAtIso,
        reason: body.reason ?? "manual",
      })
    } else if (typeof body.amount === "number" && typeof body.ratePercent === "number") {
      result = await points.earnFromPurchase(
        customerId,
        body.amount,
        body.ratePercent,
        validDays,
        earnedAtIso,
        body.reason ?? "purchase"
      )
    } else {
      res.status(400).json({ message: "points 또는 (amount + ratePercent) 가 필요합니다." })
      return
    }
    const balance = await points.getBalance(customerId)
    res.status(200).json({ entry: result, balance })
  } catch (e: any) {
    res.status(400).json({ message: String(e?.message ?? "적립 실패") })
  }
}
