/**
 * 세금계산서 ↔ 정산 기간 링크 Admin API (d7 정산관리 연동)
 *
 *  - POST /admin/tax-invoices/:id/link-payout
 *      body = { payoutId: string }         정산 기간 id 연결
 *  - DELETE /admin/tax-invoices/:id/link-payout
 *      정산 기간 연결 해제
 *
 * 취소(cancelled) 상태 세금계산서는 연결 금지(서비스 레이어에서 400 반환).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TAX_INVOICE_MODULE } from "../../../../../modules/tax-invoice"
import TaxInvoiceModuleService from "../../../../../modules/tax-invoice/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TAX_INVOICE_MODULE) as unknown as TaxInvoiceModuleService
  const body = (req.body ?? {}) as { payoutId?: string }

  if (!body.payoutId) {
    res.status(400).json({ message: "payoutId 가 필요합니다." })
    return
  }

  try {
    const row = await svc.linkToPayout(req.params.id, body.payoutId)
    res.status(200).json({ tax_invoice: row })
  } catch (e: any) {
    const msg = String(e?.message ?? "링크 실패")
    res.status(msg.includes("존재하지 않는") ? 404 : 400).json({ message: msg })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TAX_INVOICE_MODULE) as unknown as TaxInvoiceModuleService
  try {
    const row = await svc.unlinkFromPayout(req.params.id)
    res.status(200).json({ tax_invoice: row })
  } catch (e: any) {
    const msg = String(e?.message ?? "링크 해제 실패")
    res.status(msg.includes("존재하지 않는") ? 404 : 400).json({ message: msg })
  }
}
