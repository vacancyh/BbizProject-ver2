/**
 * 창고(재고 위치) 관리 API 클라이언트 — Medusa /admin/stock-locations 호출/래핑(로직 복사 X).
 *
 * Medusa v2 stock-locations CRUD:
 *  - GET    /admin/stock-locations        → 목록
 *  - POST   /admin/stock-locations        → 생성
 *  - GET    /admin/stock-locations/:id    → 상세
 *  - POST   /admin/stock-locations/:id   → 수정
 *  - DELETE /admin/stock-locations/:id   → 삭제
 */
import { apiFetch } from "./client";

/** 창고(재고 위치) */
export type Warehouse = {
  id: string;
  name: string;
  address?: {
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    country_code?: string | null;
    phone?: string | null;
    postal_code?: string | null;
    province?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
};

/** 창고 생성 입력 */
export type CreateWarehouseInput = {
  name: string;
  address?: {
    address_1?: string;
    city?: string;
    country_code?: string;
    phone?: string;
    postal_code?: string;
  };
};

/** 창고 목록 조회 */
export function listWarehouses(params?: { limit?: number; offset?: number }): Promise<{
  stock_locations: Warehouse[];
  count: number;
}> {
  const qs = new URLSearchParams();
  qs.set("fields", "id,name,address,created_at,updated_at");
  qs.set("limit", String(params?.limit ?? 50));
  qs.set("offset", String(params?.offset ?? 0));
  return apiFetch(`/admin/stock-locations?${qs.toString()}`);
}

/** 창고 상세 조회 */
export function getWarehouse(id: string): Promise<{ stock_location: Warehouse }> {
  return apiFetch(`/admin/stock-locations/${id}?fields=id,name,address,created_at,updated_at`);
}

/** 창고 생성 */
export function createWarehouse(input: CreateWarehouseInput): Promise<{ stock_location: Warehouse }> {
  return apiFetch(`/admin/stock-locations`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 창고 수정 */
export function updateWarehouse(id: string, input: Partial<CreateWarehouseInput>): Promise<{ stock_location: Warehouse }> {
  return apiFetch(`/admin/stock-locations/${id}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 창고 삭제 */
export function deleteWarehouse(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/stock-locations/${id}`, { method: "DELETE" });
}
