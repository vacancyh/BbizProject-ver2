/**
 * 상품 태그 API 호출 레이어 — Medusa REST /admin/product-tags 호출/래핑(로직 복사 X).
 * GAP_A: Medusa 有·우리 자리 미정 → 카테고리 도메인 내 신규 화면.
 */
import { apiFetch } from "./client";

export type ProductTag = { id: string; value: string; products?: { id: string }[] };

/** 태그 목록(연결 상품 수 포함). */
export function listTags(params: { q?: string; limit?: number; offset?: number } = {}): Promise<{
  product_tags: ProductTag[];
  count: number;
}> {
  const qs = new URLSearchParams({ fields: "id,value,products.id", order: "value" });
  if (params.q) qs.set("q", params.q);
  qs.set("limit", String(params.limit ?? 100));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch(`/admin/product-tags?${qs.toString()}`);
}

/** 태그 생성. */
export function createTag(value: string): Promise<{ product_tag: ProductTag }> {
  return apiFetch(`/admin/product-tags`, { method: "POST", body: JSON.stringify({ value }) });
}

/** 태그 수정. */
export function updateTag(id: string, value: string): Promise<{ product_tag: ProductTag }> {
  return apiFetch(`/admin/product-tags/${id}`, { method: "POST", body: JSON.stringify({ value }) });
}

/** 태그 삭제. */
export function deleteTag(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/product-tags/${id}`, { method: "DELETE" });
}
