/**
 * 상품 분류 체계(상품군/유형/분류) API — 한국형 product-type 커스텀 모듈 래핑.
 *  - 분야(상품군) → 분류(유형) 2계층 + 분류별 옵션 템플릿 + 고시 필수항목.
 *  - Medusa 진열 카테고리와 별개 축(상품정보제공고시 기반).
 */
import { apiFetch } from "./client";

export type OptionTemplate = { option_title: string; option_values: string[]; rank: number };
export type DisclosureField = {
  field_key: string;
  label: string;
  required: boolean;
  input_type: string;
  sort_order: number;
};

export type ProductTypeNode = {
  id: string;
  parent_id: string | null;
  name: string;
  disclosure_code: string | null;
  rank: number;
  options: OptionTemplate[];
  disclosure_fields: DisclosureField[];
  children?: ProductTypeNode[];
};

/** 분류 체계 트리(분야 → 분류) 조회. */
export function getProductTypes(): Promise<{ product_types: ProductTypeNode[] }> {
  return apiFetch("/admin/catalog-types");
}

export type CreateTypeInput = {
  name: string;
  parent_id?: string | null;
  disclosure_code?: string;
  rank?: number;
  options?: { option_title: string; option_values: string[]; rank?: number }[];
  disclosure_fields?: { field_key: string; label: string; required?: boolean }[];
};

/** 분야/분류 생성(분류는 parent_id 지정). */
export function createProductType(input: CreateTypeInput): Promise<{ product_type: ProductTypeNode }> {
  return apiFetch("/admin/catalog-types", { method: "POST", body: JSON.stringify(input) });
}

/** 분야/분류 삭제(소속 옵션·고시 함께). */
export function deleteProductType(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/catalog-types/${id}`, { method: "DELETE" });
}

/** 분류에 옵션 템플릿 추가. */
export function addOption(
  id: string,
  option_title: string,
  option_values: string[]
): Promise<unknown> {
  return apiFetch(`/admin/catalog-types/${id}/options`, {
    method: "POST",
    body: JSON.stringify({ option_title, option_values }),
  });
}

/** 분류에 고시 필수항목 추가. */
export function addDisclosureField(
  id: string,
  field_key: string,
  label: string,
  required = true
): Promise<unknown> {
  return apiFetch(`/admin/catalog-types/${id}/disclosure-fields`, {
    method: "POST",
    body: JSON.stringify({ field_key, label, required }),
  });
}
