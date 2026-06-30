// 타임세일 데이터 계층 (실제 백엔드 연동)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트 `GET /store/time-sales` (현재 진행중 세일) + 상품은 실제 store API 조회.

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { listProducts } from "./products"

export type TimeSale = {
  id: string
  product_id: string
  title: string
  discount_type: string
  discount_value: number
  original_price: number | null
  starts_at: string
  ends_at: string
}

export type TimeSaleView = TimeSale & {
  product?: HttpTypes.StoreProduct
}

export async function listActiveTimeSales(
  countryCode: string
): Promise<TimeSaleView[]> {
  let sales: TimeSale[] = []
  try {
    const res = await sdk.client.fetch<{ time_sales: TimeSale[] }>(
      `/store/time-sales`,
      { method: "GET", cache: "no-store" }
    )
    sales = res?.time_sales ?? []
  } catch {
    return []
  }
  if (!sales.length) return []

  const ids = Array.from(new Set(sales.map((s) => s.product_id)))
  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: { id: ids, limit: ids.length } as HttpTypes.StoreProductListParams,
  })
  const byId = new Map(products.map((p) => [p.id, p]))

  return sales.map((s) => ({ ...s, product: byId.get(s.product_id) }))
}
