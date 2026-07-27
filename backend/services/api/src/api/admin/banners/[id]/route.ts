/**
 * 배너/팝업 단건 수정/삭제 Admin API
 *  - POST   /admin/banners/:id  → 수정(부분 갱신)
 *  - DELETE /admin/banners/:id  → 삭제(soft delete)
 * 권한 검사는 src/api/middlewares.ts (settings 메뉴) 에서 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"
import { BANNER_KINDS } from "../../../../modules/cms/models/banner"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const id = req.params.id
  const b = (req.body ?? {}) as Record<string, unknown>

  const update: Record<string, unknown> = { id }
  if (b.kind !== undefined) {
    if (!BANNER_KINDS.includes(String(b.kind) as any)) {
      res.status(400).json({ message: "유효한 배너 종류가 아닙니다." })
      return
    }
    update.kind = String(b.kind)
  }
  // URL 스킴 검증(보안점검 2026-07-27): http(s)/상대경로만 허용(javascript:/data: 차단)
  const isSafeUrl = (u: string) => /^https?:\/\//i.test(u) || u.startsWith("/")
  if (b.title !== undefined) update.title = String(b.title).trim()
  if (b.image_url !== undefined) {
    const iu = String(b.image_url).trim()
    if (iu && !isSafeUrl(iu)) {
      res.status(400).json({ message: "이미지 URL 형식이 올바르지 않습니다(http(s):// 또는 /)." })
      return
    }
    update.image_url = iu
  }
  if (b.link_url !== undefined) {
    const lu = b.link_url ? String(b.link_url).trim() : null
    if (lu && !isSafeUrl(lu)) {
      res.status(400).json({ message: "링크 URL 형식이 올바르지 않습니다(http(s):// 또는 /)." })
      return
    }
    update.link_url = lu
  }
  if (b.sort_order !== undefined) update.sort_order = Number(b.sort_order) || 0
  if (b.status !== undefined)
    update.status = b.status === "draft" ? "draft" : "published"
  if (b.starts_at !== undefined)
    update.starts_at = b.starts_at ? new Date(String(b.starts_at)) : null
  if (b.ends_at !== undefined)
    update.ends_at = b.ends_at ? new Date(String(b.ends_at)) : null

  const [updated] = await cms.updateBanners([update as any])
  res.json({ banner: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  await cms.deleteBanners(req.params.id)
  res.json({ id: req.params.id, object: "banner", deleted: true })
}
