/**
 * 현금영수증/세금계산서 신청 Store API
 *  - POST /store/orders/:id/tax-receipt
 *      { type: "cash_receipt", identifier }                  → 현금영수증(소득공제/지출증빙) 신청 = 주문 메모
 *      { type: "tax_invoice", biz_no, company_name }         → 세금계산서 신청 = tax-invoice 모듈(pending)
 * 인증: 로그인 고객 본인 주문만.
 * 가드레일: Medusa core 미수정. tax-invoice / order-ops-kr 모듈만 사용.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { TAX_INVOICE_MODULE } from "../../../../../modules/tax-invoice"
import type TaxInvoiceModuleService from "../../../../../modules/tax-invoice/service"
import { ORDER_OPS_KR_MODULE } from "../../../../../modules/order-ops-kr"
import type OrderOpsKrModuleService from "../../../../../modules/order-ops-kr/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }
  const orderId = req.params.id
  const body = (req.body ?? {}) as {
    type?: string
    identifier?: string
    biz_no?: string
    company_name?: string
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "display_id", "email", "total"],
    filters: { id: orderId } as Record<string, unknown>,
  })
  const order = (data ?? [])[0] as any
  if (!order) {
    res.status(404).json({ message: "주문을 찾을 수 없습니다." })
    return
  }
  if (order.customer_id !== customerId) {
    res.status(403).json({ message: "본인 주문만 신청할 수 있습니다." })
    return
  }

  if (body.type === "tax_invoice") {
    if (!body.biz_no) {
      res.status(400).json({ message: "사업자등록번호는 필수입니다." })
      return
    }
    const svc = req.scope.resolve(
      TAX_INVOICE_MODULE
    ) as unknown as TaxInvoiceModuleService
    try {
      await svc.createInvoice({
        customerId,
        orderId,
        bizNo: body.biz_no,
        companyName: body.company_name ?? null,
        amount: Number(order.total) || 0,
      })
    } catch (e) {
      res.status(400).json({ message: (e as Error).message })
      return
    }
    res.status(201).json({ requested: true, type: "tax_invoice" })
    return
  }

  if (body.type === "cash_receipt") {
    if (!body.identifier || !body.identifier.trim()) {
      res.status(400).json({ message: "현금영수증 발급 정보(휴대폰/현금영수증카드)를 입력해 주세요." })
      return
    }
    const ops = req.scope.resolve(
      ORDER_OPS_KR_MODULE
    ) as unknown as OrderOpsKrModuleService
    await ops.addMemo(
      orderId,
      `[현금영수증 신청] 식별번호: ${body.identifier.trim()}`,
      { id: customerId, email: order.email ?? null },
      "memo"
    )
    res.status(201).json({ requested: true, type: "cash_receipt" })
    return
  }

  res.status(400).json({ message: "type 은 cash_receipt 또는 tax_invoice 여야 합니다." })
}
