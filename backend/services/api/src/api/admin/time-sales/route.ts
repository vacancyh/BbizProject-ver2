/**
 * 타임세일 목록/생성 Admin API
 *  - GET  /admin/time-sales?product_id=&status=&limit=&offset=   목록(listSales)
 *  - POST /admin/time-sales                                       생성(validateSale 실패 시 400, 성공 201)
 * 권한 검사·감사 기록은 src/api/middlewares.ts(time-sales 메뉴) 가 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TIME_SALE_MODULE } from "../../../modules/time-sale"
import TimeSaleModuleService, {
  type SaleListFilter,
  type DiscountType,
  type SaleStatus,
} from "../../../modules/time-sale/service"
import { validateSale } from "../../../modules/time-sale/logic"

const VALID_STATUS: SaleStatus[] = ["scheduled", "active", "ended"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TIME_SALE_MODULE) as unknown as TimeSaleModuleService
  const q = req.query as Record<string, string | undefined>
  const filter: SaleListFilter = {}
  if (q.product_id) filter.product_id = q.product_id
  if (q.status && VALID_STATUS.includes(q.status as SaleStatus)) {
    filter.status = q.status as SaleStatus
  }
  const limit = q.limit ? Number(q.limit) : 50
  const offset = q.offset ? Number(q.offset) : 0
  const { items, count } = await svc.listSales(filter, { limit, offset })
  res.json({ time_sales: items, count, limit, offset })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(TIME_SALE_MODULE) as unknown as TimeSaleModuleService
  const body = (req.body ?? {}) as {
    product_id?: string
    title?: string
    discount_type?: string
    discount_value?: number
    original_price?: number | null
    starts_at?: string
    ends_at?: string
  }

  if (!body.product_id || !body.title) {
    res.status(400).json({ message: "product_id 와 title 은 필수입니다." })
    return
  }

  const check = validateSale({
    discountType: body.discount_type as DiscountType,
    discountValue: Number(body.discount_value),
    startsAt: body.starts_at ?? "",
    endsAt: body.ends_at ?? "",
  })
  if (!check.valid) {
    res.status(400).json({ message: "세일 입력 검증 실패", errors: check.errors })
    return
  }

  const created = await svc.createSale({
    product_id: body.product_id,
    title: body.title,
    discount_type: body.discount_type as DiscountType,
    discount_value: Number(body.discount_value),
    original_price:
      body.original_price === undefined || body.original_price === null
        ? null
        : Number(body.original_price),
    starts_at: body.starts_at as string,
    ends_at: body.ends_at as string,
  })
  res.status(201).json({ time_sale: created })
}
