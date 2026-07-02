/**
 * 베스트(인기) 상품 Store API
 *  - GET /store/best-products?limit=20&days=30
 *    → { products: [{ product_id, score, views, wishCount, sales }] } (score DESC)
 *
 * 랭킹 신호(가중): 최근 N일 판매수량(강) + 위시 수 + 조회수. 전부 무비용 수집 데이터.
 * 판매수량은 최근 days 일(기본 30) 주문 라인아이템 수량 합. 조회/위시는 누적.
 * 상품 상세 데이터는 스토어프론트가 표준 store products API 로 조회한다.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_CURATION_MODULE } from "../../../modules/product-curation"
import type ProductCurationModuleService from "../../../modules/product-curation/service"

/** 최근 N일 주문 라인아이템 수량을 상품별로 집계. 실패 시 빈 배열(행동신호로 폴백). */
async function recentSales(
  req: MedusaRequest,
  days: number
): Promise<Array<{ product_id: string; qty: number }>> {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    // items.detail.quantity 를 함께 요청해야 items.quantity 가 채워짐(Medusa 특성).
    const { data } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "created_at",
        "items.product_id",
        "items.quantity",
        "items.detail.quantity",
      ],
      filters: { created_at: { $gte: since } } as Record<string, unknown>,
    })
    const map = new Map<string, number>()
    for (const order of data ?? []) {
      for (const item of (order as any).items ?? []) {
        const pid = item?.product_id as string | undefined
        if (!pid) continue
        const qty = Number(item?.quantity ?? item?.detail?.quantity ?? 0) || 0
        map.set(pid, (map.get(pid) ?? 0) + qty)
      }
    }
    return Array.from(map.entries()).map(([product_id, qty]) => ({ product_id, qty }))
  } catch (e) {
    console.warn("[best-products] 판매 집계 실패:", (e as Error)?.message)
    return []
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(
    PRODUCT_CURATION_MODULE
  ) as unknown as ProductCurationModuleService
  const raw = Number((req.query as any)?.limit)
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : 20
  const rawDays = Number((req.query as any)?.days)
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 365) : 30

  const sales = await recentSales(req, days)
  const products = await svc.getBestProducts(limit, sales)
  res.json({ products, product_ids: products.map((p) => p.product_id) })
}
