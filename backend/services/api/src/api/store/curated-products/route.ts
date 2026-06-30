/**
 * 홈 큐레이션(MD 추천) Store API
 *  - GET /store/curated-products  → 게시된 추천 상품 id 목록(sort_order 오름차순)
 * 상품 데이터는 스토어프론트가 표준 store products API 로 조회한다.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const product_ids = await cms.listCuratedProductIds()
  res.json({ product_ids })
}
