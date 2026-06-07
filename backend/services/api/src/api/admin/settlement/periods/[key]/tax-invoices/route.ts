/**
 * 정산 기간별 세금계산서 목록 Admin API (d7 정산관리 ↔ 세금계산서 연동)
 *
 *  - GET /admin/settlement/periods/:key/tax-invoices
 *      기간 period_key 로 settlement_payout.id 조회 후
 *      해당 payout_id 에 연결된 세금계산서 목록 반환.
 *      기간이 없으면 404. 연결된 세금계산서 없으면 빈 배열([]).
 *
 * 교차 모듈 조회(settlement-payout → tax-invoice) — FK 없는 느슨 연결(text payout_id).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SETTLEMENT_PAYOUT_MODULE } from "../../../../../../modules/settlement-payout"
import SettlementPayoutModuleService from "../../../../../../modules/settlement-payout/service"
import { TAX_INVOICE_MODULE } from "../../../../../../modules/tax-invoice"
import TaxInvoiceModuleService from "../../../../../../modules/tax-invoice/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const payoutSvc = req.scope.resolve(SETTLEMENT_PAYOUT_MODULE) as unknown as SettlementPayoutModuleService
  const taxSvc = req.scope.resolve(TAX_INVOICE_MODULE) as unknown as TaxInvoiceModuleService

  // 1) period_key → settlement_payout 레코드 조회
  const period = await payoutSvc.getPeriod(req.params.key)
  if (!period) {
    res.status(404).json({ message: `존재하지 않는 정산 기간: ${req.params.key}` })
    return
  }

  // 2) settlement_payout.id 로 연결된 세금계산서 목록 조회
  const invoices = await taxSvc.listByPayout(period.id)

  res.json({
    period_key: req.params.key,
    payout_id: period.id,
    tax_invoices: invoices,
    count: invoices.length,
  })
}
