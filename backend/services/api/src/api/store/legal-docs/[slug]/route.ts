/**
 * 약관/법적 문서 Store API (스토어프론트 노출용)
 *  - GET /store/legal-docs/:slug  → 해당 종류의 최신 게시(published) 약관 본문
 * slug ↔ legal_doc.type 매핑: terms-of-use=terms_of_service, privacy-policy=privacy_policy
 * 가드레일: Medusa core 미수정. legal-kr/legal-doc 모듈 전용 테이블만 조회.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyTranslationOne } from "../../../_utils/apply-translations"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const SLUG_TO_TYPE: Record<string, { type: string; title: string }> = {
  "terms-of-use": { type: "terms_of_service", title: "이용약관" },
  "privacy-policy": { type: "privacy_policy", title: "개인정보처리방침" },
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const slug = req.params.slug
  const map = SLUG_TO_TYPE[slug]
  if (!map) {
    res.status(404).json({ message: "알 수 없는 문서입니다." })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "legal_doc",
    fields: ["id", "type", "version", "body", "effective_at", "status"],
    filters: { type: map.type, status: "published" } as Record<string, unknown>,
  })

  if (!data || data.length === 0) {
    res.status(404).json({ message: "게시된 문서가 없습니다." })
    return
  }

  // 최신 버전(effective_at 내림차순) 1건
  const latest = [...data].sort((a: any, b: any) =>
    String(a.effective_at) < String(b.effective_at) ? 1 : -1
  )[0]

  // 약관 본문도 번역 대상 — 커스텀 모듈이라 직접 적용한다(2026-08-05).
  // ⚠️ 번역본의 법적 효력은 별도 검토가 필요하다. 번역이 없으면 원문(한국어)이 그대로 나간다.
  const localized = await applyTranslationOne(req, "legal_doc", latest as any)

  res.json({
    doc: {
      slug,
      title: map.title,
      effective_at:
        latest.effective_at instanceof Date
          ? latest.effective_at.toISOString()
          : String(latest.effective_at),
      body: localized?.body ?? latest.body,
      version: latest.version,
    },
  })
}
