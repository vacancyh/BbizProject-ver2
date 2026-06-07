/**
 * 약관/방침 문서(LegalDoc) 모델 — 버전별 관리.
 *
 * 출처: t008_약관관리.md §3 (화면/상태 정의), §7 (DB 영향)
 *  - 이용약관·개인정보처리방침·마케팅 동의문 등을 종류(type) + 버전(version) 단위로 관리
 *  - 게시(published) 이후 본문 직접 수정 금지 → 새 버전(draft) 생성 강제
 *  - 필수 약관 개정 시 동의 재요청 트리거(requires_consent)
 */
import { model } from "@medusajs/framework/utils"

export const LEGAL_DOC_TYPES = [
  "terms_of_service",       // 이용약관
  "privacy_policy",         // 개인정보처리방침
  "marketing_consent",      // 마케팅 동의문
  "third_party_consent",    // 제3자 제공 동의
] as const

export type LegalDocType = (typeof LEGAL_DOC_TYPES)[number]

export const LEGAL_DOC_STATUSES = ["draft", "published", "archived"] as const
export type LegalDocStatus = (typeof LEGAL_DOC_STATUSES)[number]

const LegalDoc = model.define("legal_doc", {
  // 고유 id (prefix = ldoc)
  id: model.id({ prefix: "ldoc" }).primaryKey(),
  // 약관 종류 (이용약관·개인정보처리방침 등)
  type: model.text(),
  // 버전 문자열 (예: "v1.0", "v2.0", "2026-06-01")
  version: model.text(),
  // 약관 본문 (1자 이상)
  body: model.text(),
  // 시행일 (오늘 이후만 허용)
  effective_at: model.dateTime(),
  // 게시 상태 (draft → published → archived)
  status: model.text().default("draft"),
  // 필수 동의 여부 (true = 개정 시 동의 재요청 트리거)
  requires_consent: model.boolean().default(false),
  // 게시 처리자 admin user_id (미게시 = null)
  published_by: model.text().nullable(),
  // 게시 일시 (null = 미게시)
  published_at: model.dateTime().nullable(),
})

export default LegalDoc
