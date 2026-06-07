/**
 * 정산 기간 지급완료 Admin API
 *
 *  - POST /admin/settlement/periods/:key/pay   closed→paid (지급완료 기록)
 *      허용되지 않는 전이(open/이미 paid) = 400.
 *
 * 주: 실지급(PG 송금/계좌이체) 외부 연동은 deferred — 본 route 는 지급 상태 확정 기록.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SETTLEMENT_PAYOUT_MODULE } from "../../../../../../modules/settlement-payout"
import SettlementPayoutModuleService from "../../../../../../modules/settlement-payout/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(SETTLEMENT_PAYOUT_MODULE) as unknown as SettlementPayoutModuleService
  try {
    const row = await svc.payPeriod(req.params.key, new Date().toISOString())
    res.status(200).json({ period: row })
  } catch (e: any) {
    const msg = String(e?.message ?? "지급 처리 실패")
    res.status(msg.includes("존재하지 않는") ? 404 : 400).json({ message: msg })
  }
}
