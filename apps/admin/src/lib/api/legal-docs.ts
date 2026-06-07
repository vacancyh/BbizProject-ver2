/**
 * 약관 관리 — /admin/legal-docs 호출/래핑 (로직 복사 X).
 *
 * backend API 계약 (t008 §6):
 *  - GET  /admin/legal-docs?type=...  : 약관 목록 조회 (최신순)
 *  - POST /admin/legal-docs           : 새 약관 초안(draft) 생성
 *  - POST /admin/legal-docs/:id/publish : 약관 게시 (draft → published)
 *
 * spec: t008_약관관리.md
 */
import { apiFetch } from "./client";

// ─── 타입 정의 ─────────────────────────────────────────────────────────────

export type LegalDocType =
  | "terms_of_service"
  | "privacy_policy"
  | "marketing_consent"
  | "third_party_consent";

export type LegalDocStatus = "draft" | "published" | "archived";

export const LEGAL_DOC_TYPE_LABELS: Record<LegalDocType, string> = {
  terms_of_service: "이용약관",
  privacy_policy: "개인정보처리방침",
  marketing_consent: "마케팅 동의문",
  third_party_consent: "제3자 제공 동의",
};

export type LegalDoc = {
  id: string;
  type: LegalDocType;
  version: string;
  body: string;
  effective_at: string;
  status: LegalDocStatus;
  requires_consent: boolean;
  published_by: string | null;
  published_at: string | null;
};

export type LegalDocListResponse = {
  docs: LegalDoc[];
};

export type CreateDraftInput = {
  type: LegalDocType;
  version: string;
  body: string;
  effective_at: string;
  requires_consent?: boolean;
};

export type PublishResponse = {
  doc: LegalDoc;
  /** requires_consent=true 인 경우 동의 재요청 트리거 페이로드 포함 */
  consent_trigger?: unknown;
};

// ─── API 래퍼 ──────────────────────────────────────────────────────────────

/** 약관 목록 조회 — GET /admin/legal-docs?type=... */
export async function listLegalDocs(type?: LegalDocType): Promise<LegalDocListResponse> {
  const qs = type ? `?type=${encodeURIComponent(type)}` : "";
  return apiFetch<LegalDocListResponse>(`/admin/legal-docs${qs}`);
}

/** 새 약관 초안 생성 — POST /admin/legal-docs */
export async function createDraft(
  input: CreateDraftInput
): Promise<{ doc: LegalDoc }> {
  return apiFetch("/admin/legal-docs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 약관 게시 — POST /admin/legal-docs/:id/publish */
export async function publishDoc(id: string): Promise<PublishResponse> {
  return apiFetch<PublishResponse>(`/admin/legal-docs/${id}/publish`, {
    method: "POST",
  });
}
