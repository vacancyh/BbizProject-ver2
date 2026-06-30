/**
 * FAQ 관리 Admin API
 *  - GET  /admin/faqs   → 전체 FAQ 목록(draft 포함, sort_order 오름차순)
 *  - POST /admin/faqs   → FAQ 생성
 * 권한 검사(write)는 src/api/middlewares.ts 가 settings 메뉴 기준으로 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"
import { FAQ_CATEGORIES } from "../../../modules/cms/models/faq"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const faqs = await cms.listFaqs(
    {},
    { order: { sort_order: "ASC", created_at: "ASC" } }
  )
  res.json({ faqs, count: faqs.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const b = (req.body ?? {}) as Record<string, unknown>
  const category = String(b.category ?? "")
  const question = String(b.question ?? "").trim()
  const answer = String(b.answer ?? "").trim()
  if (!FAQ_CATEGORIES.includes(category as any)) {
    res.status(400).json({ message: "유효한 분류가 아닙니다." })
    return
  }
  if (!question || !answer) {
    res.status(400).json({ message: "질문과 답변은 필수입니다." })
    return
  }
  const [created] = await cms.createFaqs([
    {
      category,
      question,
      answer,
      sort_order: Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0,
      status: b.status === "draft" ? "draft" : "published",
    },
  ])
  res.status(201).json({ faq: created })
}
