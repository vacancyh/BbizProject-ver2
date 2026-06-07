/**
 * 위시리스트 Admin API
 *
 *  - GET  /admin/product-curation/wishlists?limit=20
 *      위시 수 상위 N개 상품 집계 (wishCount DESC)
 *
 *  - GET  /admin/product-curation/wishlists?customer_id=<id>
 *      고객별 위시리스트 상품 id 목록
 *
 *  - POST /admin/product-curation/wishlists
 *      위시 토글(추가 또는 제거)
 *      Body: { customer_id: string, product_id: string }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CURATION_MODULE } from "../../../../modules/product-curation"
import ProductCurationModuleService from "../../../../modules/product-curation/service"

/** GET /admin/product-curation/wishlists */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_CURATION_MODULE) as unknown as ProductCurationModuleService
  const q = req.query as Record<string, string | undefined>

  try {
    // customer_id 지정 시 고객별 위시리스트
    if (q.customer_id) {
      const productIds = await svc.getWishlistByCustomer(q.customer_id)
      res.json({ product_ids: productIds, count: productIds.length })
      return
    }

    // 기본: 상품별 위시 수 상위 집계
    const limit = q.limit ? Number(q.limit) : 20
    const items = await svc.getTopWishlistedProducts(limit)
    res.json({ wishlists: items, count: items.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}

/** POST /admin/product-curation/wishlists — 위시 토글 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_CURATION_MODULE) as unknown as ProductCurationModuleService
  const body = req.body as { customer_id?: string; product_id?: string }

  if (!body?.customer_id?.trim() || !body?.product_id?.trim()) {
    res.status(400).json({ message: "customer_id 와 product_id 가 필요합니다." })
    return
  }

  try {
    const result = await svc.toggleWishlist(body.customer_id.trim(), body.product_id.trim())
    res.status(200).json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}
