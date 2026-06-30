/**
 * 홈 큐레이션(MD 추천) 관리 Admin API
 *  - GET  /admin/home-curations   → 큐레이션 목록(sort_order)
 *  - POST /admin/home-curations   → 추천 상품 추가 { product_id, sort_order?, status? }
 * 권한 검사(write)는 src/api/middlewares.ts 가 settings 메뉴 기준으로 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const items = await cms.listHomeCurations(
    {},
    { order: { sort_order: "ASC", created_at: "ASC" } }
  )
  res.json({ curations: items, count: items.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const b = (req.body ?? {}) as Record<string, unknown>
  const product_id = String(b.product_id ?? "").trim()
  if (!product_id) {
    res.status(400).json({ message: "product_id 는 필수입니다." })
    return
  }
  // 중복 방지
  const existing = await cms.listHomeCurations({ product_id })
  if (existing.length) {
    res.status(409).json({ message: "이미 추가된 상품입니다." })
    return
  }
  const [created] = await cms.createHomeCurations([
    {
      product_id,
      sort_order: Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0,
      status: b.status === "draft" ? "draft" : "published",
    },
  ])
  res.status(201).json({ curation: created })
}
