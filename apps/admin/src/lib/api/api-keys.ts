/**
 * API/연동 키 — Medusa api-key-management 호출/래핑 (t004_API연동키 spec)
 *
 * 엔드포인트:
 *  GET    /admin/api-keys              → 키 목록(마스킹)
 *  POST   /admin/api-keys              → 키 발급 (평문 1회)
 *  POST   /admin/api-keys/:id/revoke   → 폐기
 *  POST   /admin/api-keys/:id/sales-channels → 채널 연결/해제
 *
 * production 연결:
 *  api-keys/page.tsx → listApiKeys / createApiKey / revokeApiKey / updateApiKeySalesChannels
 */
import { apiFetch } from "./client";

// ─── 타입 정의 ──────────────────────────────────────────────────────────────

export type ApiKeyType = "publishable" | "secret";

export type ApiKeySalesChannel = {
  id: string;
  name: string;
};

export type ApiKeyRow = {
  id: string;
  type: ApiKeyType;
  title: string;
  /** 마스킹 표시용 — 원문은 생성 직후에만 응답됨 */
  redacted: string;
  revoked_at: string | null;
  created_at: string;
  sales_channels?: ApiKeySalesChannel[];
};

export type ApiKeyCreateRequest = {
  type: ApiKeyType;
  title: string;
};

export type ApiKeyCreatedResponse = {
  api_key: ApiKeyRow & {
    /** 생성 직후 1회 노출되는 평문 토큰 */
    token: string;
  };
};

export type ApiKeyListResponse = {
  api_keys: ApiKeyRow[];
};

export type ApiKeyRevokeResponse = {
  api_key: ApiKeyRow;
};

export type ApiKeySalesChannelPatchRequest = {
  add?: string[];
  remove?: string[];
};

// ─── API 함수 ────────────────────────────────────────────────────────────────

/** API 키 목록 조회 (마스킹 상태) */
export function listApiKeys(type?: ApiKeyType): Promise<ApiKeyListResponse> {
  const qs = type ? `?type=${type}` : "";
  return apiFetch<ApiKeyListResponse>(`/admin/api-keys${qs}`);
}

/**
 * API 키 발급 — 응답에 평문 token 1회 포함.
 * 화면에서 표시 후 다시 조회 시 redacted만 노출됨(spec §8 C1).
 */
export function createApiKey(req: ApiKeyCreateRequest): Promise<ApiKeyCreatedResponse> {
  return apiFetch<ApiKeyCreatedResponse>("/admin/api-keys", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/** API 키 폐기 (spec §5 A2) */
export function revokeApiKey(id: string): Promise<ApiKeyRevokeResponse> {
  return apiFetch<ApiKeyRevokeResponse>(`/admin/api-keys/${id}/revoke`, {
    method: "POST",
  });
}

/**
 * 판매채널 연결/해제 (spec §6 API2)
 * add: 연결할 채널 id 목록, remove: 해제할 채널 id 목록
 */
export function updateApiKeySalesChannels(
  id: string,
  patch: ApiKeySalesChannelPatchRequest
): Promise<{ api_key: ApiKeyRow }> {
  return apiFetch<{ api_key: ApiKeyRow }>(
    `/admin/api-keys/${id}/sales-channels`,
    {
      method: "POST",
      body: JSON.stringify(patch),
    }
  );
}
