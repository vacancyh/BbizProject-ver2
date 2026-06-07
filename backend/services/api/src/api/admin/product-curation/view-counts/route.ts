/**
 * 상품 조회수 Admin API
 *
 *  - GET  /admin/product-curation/view-counts?limit=20
 *      조회수 상위 N개 상품 목록 (count DESC)
 *
 *  - POST /admin/product-curation/view-counts
 *      특정 상품 조회수 1 증가(테스트/관리자 수동 기록용)
 *      Body: { product_id: string }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CURATION_MODULE } from "../../../../modules/product-curation"
import ProductCurationModuleService from "../../../../modules/product-curation/service"

/** GET /admin/product-curation/view-counts?limit=20 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_CURATION_MODULE) as unknown as ProductCurationModuleService
  const limit = req.query.limit ? Number(req.query.limit) : 20

  try {
    const items = await svc.getTopViewedProducts(limit)
    res.json({ view_counts: items, count: items.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}

/** POST /admin/product-curation/view-counts — 조회수 1 증가 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_CURATION_MODULE) as unknown as ProductCurationModuleService
  const body = req.body as { product_id?: string }

  if (!body?.product_id?.trim()) {
    res.status(400).json({ message: "product_id 가 필요합니다." })
    return
  }

  try {
    const record = await svc.recordView(body.product_id.trim())
    res.status(201).json({ view_count: record })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}
