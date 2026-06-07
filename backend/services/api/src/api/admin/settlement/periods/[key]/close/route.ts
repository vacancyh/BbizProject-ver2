/**
 * 정산 기간 마감 Admin API
 *
 *  - POST /admin/settlement/periods/:key/close   open→closed (마감)
 *      허용되지 않는 전이(이미 paid 등) = 400.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SETTLEMENT_PAYOUT_MODULE } from "../../../../../../modules/settlement-payout"
import SettlementPayoutModuleService from "../../../../../../modules/settlement-payout/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(SETTLEMENT_PAYOUT_MODULE) as unknown as SettlementPayoutModuleService
  try {
    const row = await svc.closePeriod(req.params.key, new Date().toISOString())
    res.status(200).json({ period: row })
  } catch (e: any) {
    const msg = String(e?.message ?? "마감 실패")
    res.status(msg.includes("존재하지 않는") ? 404 : 400).json({ message: msg })
  }
}
