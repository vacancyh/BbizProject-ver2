/**
 * 컬렉션/기획전 API 호출 레이어 — Medusa REST /admin/collections 호출/래핑(로직 복사 X).
 * GAP_A: Medusa 有·우리 자리 미정 → 신규 화면. 홈 큐레이션(기획전) 연계 자리.
 */
import { apiFetch } from "./client";
import { slugify } from "./products";

export type Collection = {
  id: string;
  title: string;
  handle: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  products?: { id: string; title: string; thumbnail: string | null }[];
};

const FIELDS = "id,title,handle,created_at,updated_at";

/** 컬렉션 목록(연결 상품 수 포함). */
export function listCollections(params: { q?: string; limit?: number; offset?: number } = {}): Promise<{
  collections: (Collection & { products?: { id: string }[] })[];
  count: number;
}> {
  const qs = new URLSearchParams({ fields: FIELDS + ",products.id", order: "-updated_at" });
  if (params.q) qs.set("q", params.q);
  qs.set("limit", String(params.limit ?? 50));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch(`/admin/collections?${qs.toString()}`);
}

/** 컬렉션 상세(연결 상품 포함). */
export function getCollection(id: string): Promise<{ collection: Collection }> {
  const qs = new URLSearchParams({
    fields: FIELDS + ",metadata,products.id,products.title,products.thumbnail",
  });
  return apiFetch(`/admin/collections/${id}?${qs.toString()}`);
}

/** 컬렉션 생성(handle 미지정 시 title slugify). */
export function createCollection(input: { title: string; handle?: string }): Promise<{ collection: Collection }> {
  return apiFetch(`/admin/collections`, {
    method: "POST",
    body: JSON.stringify({ title: input.title, handle: input.handle || slugify(input.title) }),
  });
}

/** 컬렉션 수정(제목/handle/메타). */
export function updateCollection(
  id: string,
  patch: Partial<{ title: string; handle: string; metadata: Record<string, unknown> }>
): Promise<{ collection: Collection }> {
  return apiFetch(`/admin/collections/${id}`, { method: "POST", body: JSON.stringify(patch) });
}

/** 컬렉션 삭제. */
export function deleteCollection(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/collections/${id}`, { method: "DELETE" });
}

/** 컬렉션 ↔ 상품 연결/해제. */
export function updateCollectionProducts(
  id: string,
  body: { add?: string[]; remove?: string[] }
): Promise<{ collection: Collection }> {
  return apiFetch(`/admin/collections/${id}/products`, { method: "POST", body: JSON.stringify(body) });
}
