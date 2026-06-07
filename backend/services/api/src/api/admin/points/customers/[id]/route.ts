/**
 * 고객 포인트 조회 Admin API
 *
 *  - GET /admin/points/customers/:id
 *      포인트 잔액 + 원장(최신순) + 소멸 임박(D-30) 항목 반환.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_POINT_MODULE } from "../../../../../modules/customer-point"
import CustomerPointModuleService from "../../../../../modules/customer-point/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const points = req.scope.resolve(CUSTOMER_POINT_MODULE) as unknown as CustomerPointModuleService
  const customerId = req.params.id

  const balance = await points.getBalance(customerId)
  const ledger = await points.listLedger(customerId)
  const nowIso = new Date().toISOString()
  const expiring = await points.expiringSoon(customerId, nowIso, 30)

  res.json({ customer_id: customerId, balance, ledger, expiring_soon: expiring })
}
