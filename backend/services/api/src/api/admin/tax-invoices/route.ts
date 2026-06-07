/**
 * 세금계산서 발급 Admin API
 *
 *  - POST /admin/tax-invoices
 *      body = { customerId, bizNo, amount, companyName?, orderId? }
 *      사업자번호 검증 통과 시 pending 발급(201). 검증 실패 = 400.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TAX_INVOICE_MODULE } from "../../../modules/tax-invoice"
import TaxInvoiceModuleService from "../../../modules/tax-invoice/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TAX_INVOICE_MODULE) as unknown as TaxInvoiceModuleService
  const body = (req.body ?? {}) as {
    customerId?: string
    bizNo?: string
    amount?: number
    companyName?: string
    orderId?: string
  }

  if (!body.customerId || !body.bizNo) {
    res.status(400).json({ message: "customerId, bizNo 가 필요합니다." })
    return
  }

  try {
    const row = await svc.createInvoice({
      customerId: body.customerId,
      bizNo: body.bizNo,
      amount: typeof body.amount === "number" ? body.amount : 0,
      companyName: body.companyName ?? null,
      orderId: body.orderId ?? null,
    })
    res.status(201).json({ tax_invoice: row })
  } catch (e: any) {
    res.status(400).json({ message: String(e?.message ?? "발급 실패") })
  }
}
