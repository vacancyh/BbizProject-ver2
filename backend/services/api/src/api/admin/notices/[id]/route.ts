/**
 * 공지 단건 수정/삭제 Admin API
 *  - POST   /admin/notices/:id  → 공지 수정(부분 갱신)
 *  - DELETE /admin/notices/:id  → 공지 삭제(soft delete)
 * 권한 검사는 src/api/middlewares.ts (settings 메뉴) 에서 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const id = req.params.id
  const b = (req.body ?? {}) as Record<string, unknown>

  const update: Record<string, unknown> = { id }
  if (b.title !== undefined) update.title = String(b.title).trim()
  if (b.body !== undefined) update.body = String(b.body).trim()
  if (b.pinned !== undefined) update.pinned = Boolean(b.pinned)
  if (b.status !== undefined)
    update.status = b.status === "draft" ? "draft" : "published"

  const [updated] = await cms.updateNotices([update as any])
  res.json({ notice: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  await cms.deleteNotices(req.params.id)
  res.json({ id: req.params.id, object: "notice", deleted: true })
}
