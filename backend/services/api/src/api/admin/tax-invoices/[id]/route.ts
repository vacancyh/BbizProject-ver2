/**
 * 세금계산서 조회 Admin API
 *
 *  - GET /admin/tax-invoices/:id   세금계산서 1건 조회(없으면 404).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TAX_INVOICE_MODULE } from "../../../../modules/tax-invoice"
import TaxInvoiceModuleService from "../../../../modules/tax-invoice/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TAX_INVOICE_MODULE) as unknown as TaxInvoiceModuleService
  const row = await svc.getInvoice(req.params.id)
  if (!row) {
    res.status(404).json({ message: `존재하지 않는 세금계산서: ${req.params.id}` })
    return
  }
  res.json({ tax_invoice: row })
}
