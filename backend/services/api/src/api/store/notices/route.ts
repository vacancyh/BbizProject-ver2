/**
 * 고객센터 공지 Store API (스토어프론트 노출용)
 *  - GET /store/notices  → 게시(published) 공지 목록 (고정 우선, 최신순)
 * 가드레일: Medusa core 미수정. cms 모듈 전용 테이블만 조회.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyTranslations } from "../../_utils/apply-translations"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const notices = await cms.listPublishedNotices()
  // 커스텀 모듈이라 코어가 번역을 적용해 주지 않는다 — 직접 붙인다(2026-08-05)
  const localized = await applyTranslations(req, "notice", notices as any[])
  res.json({
    notices: localized.map((n: any) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      pinned: !!n.pinned,
      created_at:
        n.created_at instanceof Date
          ? n.created_at.toISOString()
          : String(n.created_at),
    })),
  })
}
