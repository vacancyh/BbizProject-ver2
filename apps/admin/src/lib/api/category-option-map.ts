/**
 * 카테고리 ↔ 옵션템플릿 N:M 매핑 API 호출 레이어
 *  - /admin/category-option-map CRUD 래핑
 *  - product-type 모듈(옵션템플릿)과 Medusa 카테고리 간 매핑 관리
 */
import { apiFetch } from "./client";
import type { OptionTemplate } from "./product-types";

export type CategoryOptionMap = {
  map_id: string;
  category_id: string;
  option_tmpl_id: string;
  sort_order: number;
  option: (OptionTemplate & { id: string }) | null;
};

/** 특정 카테고리에 매핑된 옵션템플릿 목록 조회 */
export function listCategoryOptionMaps(
  categoryId: string
): Promise<{ category_option_maps: CategoryOptionMap[]; count: number }> {
  return apiFetch(`/admin/category-option-map?category_id=${encodeURIComponent(categoryId)}`);
}

/** 카테고리에 옵션템플릿 매핑 추가 */
export function createCategoryOptionMap(input: {
  category_id: string;
  option_tmpl_id: string;
  sort_order?: number;
}): Promise<{ category_option_map: CategoryOptionMap }> {
  return apiFetch("/admin/category-option-map", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 매핑 1건 삭제 */
export function deleteCategoryOptionMap(
  mapId: string
): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/category-option-map/${mapId}`, { method: "DELETE" });
}

/** 매핑 sort_order 변경 */
export function updateCategoryOptionMapOrder(
  mapId: string,
  sort_order: number
): Promise<{ category_option_map: CategoryOptionMap }> {
  return apiFetch(`/admin/category-option-map/${mapId}`, {
    method: "PATCH",
    body: JSON.stringify({ sort_order }),
  });
}
