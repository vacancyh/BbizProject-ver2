/**
 * FAQ 단건 수정/삭제 Admin API
 *  - POST   /admin/faqs/:id  → FAQ 수정(부분 갱신)
 *  - DELETE /admin/faqs/:id  → FAQ 삭제(soft delete)
 * 권한 검사는 src/api/middlewares.ts (settings 메뉴) 에서 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { FAQ_CATEGORIES } from "../../../../modules/cms/models/faq"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const id = req.params.id
  const b = (req.body ?? {}) as Record<string, unknown>

  const update: Record<string, unknown> = { id }
  if (b.category !== undefined) {
    if (!FAQ_CATEGORIES.includes(String(b.category) as any)) {
      res.status(400).json({ message: "유효한 분류가 아닙니다." })
      return
    }
    update.category = String(b.category)
  }
  if (b.question !== undefined) update.question = String(b.question).trim()
  if (b.answer !== undefined) update.answer = String(b.answer).trim()
  if (b.sort_order !== undefined) update.sort_order = Number(b.sort_order) || 0
  if (b.status !== undefined)
    update.status = b.status === "draft" ? "draft" : "published"

  const [updated] = await cms.updateFaqs([update as any])
  res.json({ faq: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  await cms.deleteFaqs(req.params.id)
  res.json({ id: req.params.id, object: "faq", deleted: true })
}
