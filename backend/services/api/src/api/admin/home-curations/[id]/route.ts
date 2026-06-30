/**
 * 홈 큐레이션 단건 수정/삭제 Admin API
 *  - POST   /admin/home-curations/:id  → 수정(sort_order/status)
 *  - DELETE /admin/home-curations/:id  → 삭제
 * 권한 검사는 src/api/middlewares.ts (settings 메뉴).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const id = req.params.id
  const b = (req.body ?? {}) as Record<string, unknown>
  const update: Record<string, unknown> = { id }
  if (b.sort_order !== undefined) update.sort_order = Number(b.sort_order) || 0
  if (b.status !== undefined)
    update.status = b.status === "draft" ? "draft" : "published"
  const [updated] = await cms.updateHomeCurations([update as any])
  res.json({ curation: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  await cms.deleteHomeCurations(req.params.id)
  res.json({ id: req.params.id, object: "home_curation", deleted: true })
}
