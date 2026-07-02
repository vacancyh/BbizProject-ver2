/**
 * 상품 조회수 기록 Store API
 *  - POST /store/products/:id/view → 해당 상품 조회수 +1 (202)
 *
 * 무비용: 상품 상세 진입 시 호출되어 베스트(인기) 랭킹의 조회 신호를 실시간 집계.
 * 실패해도 상세 페이지 UX 를 막지 않도록 항상 202 로 조용히 응답.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CURATION_MODULE } from "../../../../../modules/product-curation"
import type ProductCurationModuleService from "../../../../../modules/product-curation/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const productId = String((req.params as any)?.id ?? "")
  if (!productId) {
    res.status(202).json({ recorded: false })
    return
  }
  try {
    const svc = req.scope.resolve(
      PRODUCT_CURATION_MODULE
    ) as unknown as ProductCurationModuleService
    await svc.recordView(productId)
    res.status(202).json({ recorded: true })
  } catch {
    res.status(202).json({ recorded: false })
  }
}
