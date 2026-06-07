/**
 * 세금계산서 상태 전이 Admin API
 *
 *  - POST /admin/tax-invoices/:id/transition
 *      body = { to: "issued"|"amended"|"cancelled" }
 *      허용표 검증(canTransitionTaxInvoice). 불가 전이 = 400.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TAX_INVOICE_MODULE } from "../../../../../modules/tax-invoice"
import TaxInvoiceModuleService from "../../../../../modules/tax-invoice/service"
import { TAX_INVOICE_STATUSES, type TaxInvoiceStatus } from "../../../../../modules/tax-invoice/logic"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TAX_INVOICE_MODULE) as unknown as TaxInvoiceModuleService
  const body = (req.body ?? {}) as { to?: string }

  if (!body.to || !TAX_INVOICE_STATUSES.includes(body.to as TaxInvoiceStatus)) {
    res.status(400).json({ message: `to 는 ${TAX_INVOICE_STATUSES.join("/")} 중 하나여야 합니다.` })
    return
  }

  try {
    const row = await svc.transition(req.params.id, body.to as TaxInvoiceStatus)
    res.status(200).json({ tax_invoice: row })
  } catch (e: any) {
    const msg = String(e?.message ?? "전이 실패")
    const code = msg.includes("존재하지 않는") ? 404 : 400
    res.status(code).json({ message: msg })
  }
}
