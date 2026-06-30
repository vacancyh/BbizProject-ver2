/**
 * 배너/팝업 Store API (스토어프론트 노출용)
 *  - GET /store/banners?kind=hero|popup  → 게시 + 노출기간 내 배너 목록(sort_order 오름차순)
 * 가드레일: Medusa core 미수정. cms 모듈 전용 테이블만 조회.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../modules/cms"
import type CmsModuleService from "../../../modules/cms/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cms = req.scope.resolve(CMS_MODULE) as unknown as CmsModuleService
  const kindParam = String((req.query.kind as string) ?? "hero")
  const kind = kindParam === "popup" ? "popup" : "hero"
  const banners = await cms.listActiveBanners(kind)
  res.json({
    banners: banners.map((b: any) => ({
      id: b.id,
      kind: b.kind,
      title: b.title,
      image_url: b.image_url,
      link_url: b.link_url ?? null,
    })),
  })
}
