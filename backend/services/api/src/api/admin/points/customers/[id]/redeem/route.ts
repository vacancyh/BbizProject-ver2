/**
 * 고객 포인트 사용 Admin API
 *
 *  - POST /admin/points/customers/:id/redeem
 *      body = { useAmount: number, reason? }
 *      잔액 검증(canRedeemPoints) 후 사용 1행(음수) 적재. 잔액 초과/0 이하 = 400.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_POINT_MODULE } from "../../../../../../modules/customer-point"
import CustomerPointModuleService from "../../../../../../modules/customer-point/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const points = req.scope.resolve(CUSTOMER_POINT_MODULE) as unknown as CustomerPointModuleService
  const customerId = req.params.id
  const body = (req.body ?? {}) as { useAmount?: number; reason?: string }

  if (typeof body.useAmount !== "number") {
    res.status(400).json({ message: "useAmount(숫자)가 필요합니다." })
    return
  }

  try {
    const result = await points.redeemPoints(customerId, body.useAmount, body.reason ?? "redeem")
    res.status(200).json({ entry: result, balance: result.balance_after })
  } catch (e: any) {
    res.status(400).json({ message: String(e?.message ?? "사용 실패") })
  }
}
