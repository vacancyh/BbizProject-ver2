/**
 * 공지 관리 Admin API
 *  - GET  /admin/notices            → 전체 공지 목록(draft 포함, 고정 우선·최신순)
 *  - POST /admin/notices            → 공지 생성
 * 권한 검사(write)는 src/api/middlewares.ts 가 settings 메뉴 기준으로 수행.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const notices = await cms.listNotices(
    {},
    { order: { pinned: "DESC", created_at: "DESC" } }
  )
  res.json({ notices, count: notices.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const b = (req.body ?? {}) as Record<string, unknown>
  const title = String(b.title ?? "").trim()
  const body = String(b.body ?? "").trim()
  if (!title || !body) {
    res.status(400).json({ message: "제목과 본문은 필수입니다." })
    return
  }
  const [created] = await cms.createNotices([
    {
      title,
      body,
      pinned: Boolean(b.pinned),
      status: b.status === "draft" ? "draft" : "published",
    },
  ])
  res.status(201).json({ notice: created })
}
