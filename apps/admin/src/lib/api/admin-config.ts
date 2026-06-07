/**
 * 어드민 설정 확장 API — Medusa REST 래핑 전용(로직 복사 금지).
 *  - 세금(tax-regions, tax-rates)
 *  - 반품 사유(return-reasons) + 환불 사유(refund-reasons)
 *  - API 키(api-keys)
 *  - 관리자 계정(users) + 초대(invites)
 *
 * 확인된 필수 필드:
 *  - POST /admin/tax-regions        → { country_code }  (province_code?)
 *  - POST /admin/tax-rates          → { code, name, tax_region_id }  (rate?, is_combinable?)
 *  - DELETE /admin/tax-regions/:id  → { id, deleted }
 *  - DELETE /admin/tax-rates/:id    → { id, deleted }
 *  - POST /admin/return-reasons     → { value, label }  (description?)
 *  - POST /admin/refund-reasons     → { label, code }   (description?)
 *  - POST /admin/api-keys           → { title, type }
 *  - POST /admin/api-keys/:id/revoke → (body 없음)
 *  - DELETE /admin/api-keys/:id     → { id, deleted }
 *  - POST /admin/invites            → { email }
 *  - DELETE /admin/invites/:id      → { id, deleted }
 */
import { apiFetch } from "./client";

// ─────────────── 세금 ───────────────

export type TaxRate = {
  id: string;
  name: string;
  code: string;
  rate: number | null;
  is_combinable: boolean;
  tax_region_id: string;
  created_at: string;
  updated_at: string;
};

export type TaxRegion = {
  id: string;
  country_code: string;
  province_code: string | null;
  tax_rates: TaxRate[];
};

/** 세금 지역 목록 (세율 포함). */
export async function listTaxRegions(): Promise<TaxRegion[]> {
  const { tax_regions } = await apiFetch<{ tax_regions: TaxRegion[] }>(
    "/admin/tax-regions?limit=100&fields=id,country_code,province_code,*tax_rates"
  );
  return tax_regions;
}

/** 세금 지역 생성. 필수: country_code. */
export function createTaxRegion(body: {
  country_code: string;
  province_code?: string;
}): Promise<{ tax_region: TaxRegion }> {
  return apiFetch("/admin/tax-regions", { method: "POST", body: JSON.stringify(body) });
}

/** 세금 지역 삭제. */
export function deleteTaxRegion(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/tax-regions/${id}`, { method: "DELETE" });
}

/** 세율 생성 (standalone endpoint). 필수: code, name, tax_region_id. */
export function createTaxRate(body: {
  code: string;
  name: string;
  tax_region_id: string;
  rate?: number;
  is_combinable?: boolean;
}): Promise<{ tax_rate: TaxRate }> {
  return apiFetch("/admin/tax-rates", { method: "POST", body: JSON.stringify(body) });
}

/**
 * 세율 수정 — spec t002 §5 A1 (POST /admin/tax-regions/:id 래핑).
 * Medusa v2 는 tax-rate 수정 = POST /admin/tax-rates/:id.
 */
export function updateTaxRate(
  id: string,
  patch: { rate?: number; name?: string; code?: string; is_combinable?: boolean }
): Promise<{ tax_rate: TaxRate }> {
  return apiFetch(`/admin/tax-rates/${id}`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

/** 세율 삭제. */
export function deleteTaxRate(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/tax-rates/${id}`, { method: "DELETE" });
}

// ─────────────── 반품 사유 ───────────────

export type ReturnReason = {
  id: string;
  value: string;
  label: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

/** 반품 사유 목록. */
export async function listReturnReasons(): Promise<ReturnReason[]> {
  const { return_reasons } = await apiFetch<{ return_reasons: ReturnReason[] }>(
    "/admin/return-reasons?limit=100"
  );
  return return_reasons;
}

/** 반품 사유 생성. 필수: value, label. */
export function createReturnReason(body: {
  value: string;
  label: string;
  description?: string;
}): Promise<{ return_reason: ReturnReason }> {
  return apiFetch("/admin/return-reasons", { method: "POST", body: JSON.stringify(body) });
}

/** 반품 사유 수정. */
export function updateReturnReason(
  id: string,
  body: { label?: string; description?: string }
): Promise<{ return_reason: ReturnReason }> {
  return apiFetch(`/admin/return-reasons/${id}`, { method: "POST", body: JSON.stringify(body) });
}

/** 반품 사유 삭제. */
export function deleteReturnReason(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/return-reasons/${id}`, { method: "DELETE" });
}

// ─────────────── 환불 사유 ───────────────

export type RefundReason = {
  id: string;
  label: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

/** 환불 사유 목록. */
export async function listRefundReasons(): Promise<RefundReason[]> {
  const { refund_reasons } = await apiFetch<{ refund_reasons: RefundReason[] }>(
    "/admin/refund-reasons?limit=100"
  );
  return refund_reasons;
}

/** 환불 사유 생성. 필수: label, code. */
export function createRefundReason(body: {
  label: string;
  code: string;
  description?: string;
}): Promise<{ refund_reason: RefundReason }> {
  return apiFetch("/admin/refund-reasons", { method: "POST", body: JSON.stringify(body) });
}

/** 환불 사유 수정. */
export function updateRefundReason(
  id: string,
  body: { label?: string; description?: string }
): Promise<{ refund_reason: RefundReason }> {
  return apiFetch(`/admin/refund-reasons/${id}`, { method: "POST", body: JSON.stringify(body) });
}

/** 환불 사유 삭제. */
export function deleteRefundReason(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/refund-reasons/${id}`, { method: "DELETE" });
}

// ─────────────── API 키 ───────────────

export type ApiKey = {
  id: string;
  title: string;
  type: "publishable" | "secret";
  /** 마스킹된 토큰 표시용. */
  redacted: string;
  /** 생성 직후 1회성 노출 토큰 — 이후 API에서 사라짐. */
  token?: string;
  created_at: string;
  revoked_at: string | null;
  created_by: string | null;
};

/** API 키 목록. */
export async function listApiKeys(): Promise<ApiKey[]> {
  const { api_keys } = await apiFetch<{ api_keys: ApiKey[] }>(
    "/admin/api-keys?limit=100&fields=id,title,type,redacted,created_at,revoked_at,created_by"
  );
  return api_keys;
}

/** API 키 생성. 필수: title, type. 응답에 token 1회 포함. */
export function createApiKey(body: {
  title: string;
  type: "publishable" | "secret";
}): Promise<{ api_key: ApiKey }> {
  return apiFetch("/admin/api-keys", { method: "POST", body: JSON.stringify(body) });
}

/** API 키 폐기. */
export function revokeApiKey(id: string): Promise<{ api_key: ApiKey }> {
  return apiFetch(`/admin/api-keys/${id}/revoke`, { method: "POST", body: JSON.stringify({}) });
}

/** API 키 삭제. */
export function deleteApiKey(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/api-keys/${id}`, { method: "DELETE" });
}

// ─────────────── 관리자 계정 ───────────────

export type AdminUser = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

/** 관리자 계정 목록. */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const { users } = await apiFetch<{ users: AdminUser[] }>(
    "/admin/users?limit=100&fields=id,email,first_name,last_name"
  );
  return users;
}

// ─────────────── 초대 ───────────────

export type AdminInvite = {
  id: string;
  email: string;
  accepted: boolean;
  token: string;
  expires_at: string;
  created_at: string;
};

/** 초대 목록. */
export async function listInvites(): Promise<AdminInvite[]> {
  const { invites } = await apiFetch<{ invites: AdminInvite[] }>("/admin/invites?limit=100");
  return invites;
}

/** 초대 생성. 필수: email. */
export function createInvite(email: string): Promise<{ invite: AdminInvite }> {
  return apiFetch("/admin/invites", { method: "POST", body: JSON.stringify({ email }) });
}

/** 초대 재발송 (resend). */
export function resendInvite(id: string): Promise<{ invite: AdminInvite }> {
  return apiFetch(`/admin/invites/${id}/resend`, { method: "POST", body: JSON.stringify({}) });
}

/** 초대 삭제. */
export function deleteInvite(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/invites/${id}`, { method: "DELETE" });
}
