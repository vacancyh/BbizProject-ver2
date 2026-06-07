/**
 * 진열 카테고리 API 호출 레이어 — Medusa REST /admin/product-categories 호출/래핑(로직 복사 X).
 * 상품 분류 체계(상품군/유형)와 별개 — 이쪽은 "스토어프론트 진열" 축(계층/순서/노출).
 */
import { apiFetch } from "./client";
import { slugify } from "./products";

export type Category = {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  is_active: boolean;
  is_internal: boolean;
  rank: number;
  parent_category_id: string | null;
  category_children?: Category[];
};

const FIELDS =
  "id,name,handle,description,is_active,is_internal,rank,parent_category_id";
const TREE_FIELDS = FIELDS + ",category_children.id,category_children.name,category_children.handle,category_children.is_active,category_children.rank,category_children.parent_category_id";

/** 카테고리 트리(루트 + 1단계 children). */
export function listCategoryTree(): Promise<{ product_categories: Category[]; count: number }> {
  const qs = new URLSearchParams({
    fields: TREE_FIELDS,
    parent_category_id: "null",
    limit: "200",
    "order": "rank",
  });
  return apiFetch(`/admin/product-categories?${qs.toString()}`);
}

/** 전체 평면 목록(부모 선택용). */
export function listCategoriesFlat(): Promise<{ product_categories: Category[]; count: number }> {
  const qs = new URLSearchParams({ fields: FIELDS, limit: "200", order: "rank" });
  return apiFetch(`/admin/product-categories?${qs.toString()}`);
}

/** 카테고리 상세(연결 상품 포함). */
export function getCategory(
  id: string
): Promise<{ product_category: Category & { products?: { id: string; title: string; thumbnail: string | null }[] } }> {
  const qs = new URLSearchParams({
    fields: FIELDS + ",products.id,products.title,products.thumbnail",
  });
  return apiFetch(`/admin/product-categories/${id}?${qs.toString()}`);
}

export type CategoryInput = {
  name: string;
  handle?: string;
  description?: string | null;
  is_active?: boolean;
  is_internal?: boolean;
  parent_category_id?: string | null;
  rank?: number;
};

/** 카테고리 생성(handle 미지정 시 name slugify, 한글이면 timestamp 폴백). */
export function createCategory(input: CategoryInput): Promise<{ product_category: Category }> {
  return apiFetch(`/admin/product-categories`, {
    method: "POST",
    body: JSON.stringify({ ...input, handle: input.handle || slugify(input.name) }),
  });
}

/** 카테고리 수정. */
export function updateCategory(
  id: string,
  patch: Partial<CategoryInput>
): Promise<{ product_category: Category }> {
  return apiFetch(`/admin/product-categories/${id}`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

/** 카테고리 삭제. */
export function deleteCategory(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/product-categories/${id}`, { method: "DELETE" });
}

/** 카테고리 ↔ 상품 연결/해제. */
export function updateCategoryProducts(
  id: string,
  body: { add?: string[]; remove?: string[] }
): Promise<{ product_category: Category }> {
  return apiFetch(`/admin/product-categories/${id}/products`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
