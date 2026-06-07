/**
 * 배송 옵션 유형 API 호출 레이어 — Medusa REST 호출/래핑(로직 복사 X).
 *  - 목록   : GET  /admin/shipping-option-types
 *  - 생성   : POST /admin/shipping-option-types          (필수: label, code)
 *  - 수정   : POST /admin/shipping-option-types/:id      (선택: label, code, description)
 *  - 삭제   : DELETE /admin/shipping-option-types/:id
 */
import { apiFetch } from "./client";

// ───────────────────────── 배송 옵션 유형 ─────────────────────────
export type ShippingOptionType = {
  id: string;
  label: string;
  code: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
};

/** 배송 옵션 유형 목록. */
export function listShippingOptionTypes(
  limit = 100,
  offset = 0
): Promise<{ shipping_option_types: ShippingOptionType[]; count: number; limit: number; offset: number }> {
  const qs = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiFetch(`/admin/shipping-option-types?${qs.toString()}`);
}

/** 배송 옵션 유형 생성 (label·code 필수). */
export function createShippingOptionType(input: {
  label: string;
  code: string;
  description?: string;
}): Promise<{ shipping_option_type: ShippingOptionType }> {
  return apiFetch(`/admin/shipping-option-types`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 배송 옵션 유형 수정 (모든 필드 선택). */
export function updateShippingOptionType(
  id: string,
  patch: { label?: string; code?: string; description?: string }
): Promise<{ shipping_option_type: ShippingOptionType }> {
  return apiFetch(`/admin/shipping-option-types/${id}`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

/** 배송 옵션 유형 삭제. */
export function deleteShippingOptionType(
  id: string
): Promise<{ id: string; object: string; deleted: boolean }> {
  return apiFetch(`/admin/shipping-option-types/${id}`, { method: "DELETE" });
}
