/**
 * 정산 기간 목록 Admin API
 *
 *  - GET /admin/settlement/periods   정산 기간 스냅샷 목록(최신순).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SETTLEMENT_PAYOUT_MODULE } from "../../../../modules/settlement-payout"
import SettlementPayoutModuleService from "../../../../modules/settlement-payout/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(SETTLEMENT_PAYOUT_MODULE) as unknown as SettlementPayoutModuleService
  const periods = await svc.listPeriods()
  res.json({ periods, count: periods.length })
}
