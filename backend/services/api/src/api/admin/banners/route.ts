/**
 * 배너/팝업 관리 Admin API
 *  - GET  /admin/banners            → 전체 배너 목록(kind·sort_order 정렬)
 *  - POST /admin/banners            → 배너 생성
 * 권한 검사(write)는 src/api/middlewares.ts 가 settings 메뉴 기준으로 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"
import { BANNER_KINDS } from "../../../modules/cms/models/banner"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const banners = await cms.listBanners(
    {},
    { order: { kind: "ASC", sort_order: "ASC", created_at: "ASC" } }
  )
  res.json({ banners, count: banners.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const b = (req.body ?? {}) as Record<string, unknown>
  const kind = String(b.kind ?? "hero")
  const title = String(b.title ?? "").trim()
  const image_url = String(b.image_url ?? "").trim()
  if (!BANNER_KINDS.includes(kind as any)) {
    res.status(400).json({ message: "유효한 배너 종류가 아닙니다." })
    return
  }
  if (!title || !image_url) {
    res.status(400).json({ message: "제목과 이미지 URL은 필수입니다." })
    return
  }
  // URL 스킴 검증 — http(s) 또는 상대경로(/…)만 허용(javascript:/data: 등 차단). 보안점검 2026-07-27
  const isSafeUrl = (u: string) => /^https?:\/\//i.test(u) || u.startsWith("/")
  const link_url = b.link_url ? String(b.link_url).trim() : null
  if (!isSafeUrl(image_url)) {
    res.status(400).json({ message: "이미지 URL은 http(s):// 또는 / 로 시작해야 합니다." })
    return
  }
  if (link_url && !isSafeUrl(link_url)) {
    res.status(400).json({ message: "링크 URL 형식이 올바르지 않습니다(http(s):// 또는 /)." })
    return
  }
  const [created] = await cms.createBanners([
    {
      kind,
      title,
      image_url,
      link_url,
      sort_order: Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 0,
      status: b.status === "draft" ? "draft" : "published",
      starts_at: b.starts_at ? new Date(String(b.starts_at)) : null,
      ends_at: b.ends_at ? new Date(String(b.ends_at)) : null,
    },
  ])
  res.status(201).json({ banner: created })
}
