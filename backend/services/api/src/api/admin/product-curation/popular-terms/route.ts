/**
 * 인기 검색어 Admin API
 *
 *  - GET  /admin/product-curation/popular-terms?limit=10
 *      인기 검색어 목록(금칙어 제외, count DESC)
 *      // TODO(사장님결정): 인기 검색어 노출 기준(최소 count 임계값, 최신 기간 필터 등)
 *
 *  - POST /admin/product-curation/popular-terms
 *      검색어 집계 기록(관리자/테스트용)
 *      Body: { term: string }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CURATION_MODULE } from "../../../../modules/product-curation"
import ProductCurationModuleService from "../../../../modules/product-curation/service"

/** GET /admin/product-curation/popular-terms?limit=10 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_CURATION_MODULE) as unknown as ProductCurationModuleService
  const limit = req.query.limit ? Number(req.query.limit) : 10

  try {
    const items = await svc.getPopularTerms(limit)
    res.json({ popular_terms: items, count: items.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}

/** POST /admin/product-curation/popular-terms — 검색어 집계 기록 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_CURATION_MODULE) as unknown as ProductCurationModuleService
  const body = req.body as { term?: string }

  if (!body?.term?.trim()) {
    res.status(400).json({ message: "term 이 필요합니다." })
    return
  }

  try {
    const record = await svc.recordSearch(body.term.trim())
    if (!record) {
      res.status(400).json({ message: "정규화 후 빈 검색어입니다." })
      return
    }
    res.status(201).json({ popular_term: record })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}
