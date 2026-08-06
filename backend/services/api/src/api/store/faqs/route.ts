/**
 * 고객센터 FAQ Store API (스토어프론트 노출용)
 *  - GET /store/faqs  → 게시(published) FAQ 목록 (sort_order 오름차순)
 * 가드레일: Medusa core 미수정. cms 모듈 전용 테이블만 조회.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyTranslations } from "../../_utils/apply-translations"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const faqs = await cms.listPublishedFaqs()
  const localized = await applyTranslations(req, "faq", faqs as any[])
  res.json({
    faqs: localized.map((f: any) => ({
      id: f.id,
      category: f.category,
      question: f.question,
      answer: f.answer,
    })),
  })
}
