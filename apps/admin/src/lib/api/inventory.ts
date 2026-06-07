/**
 * 재고 관리 — Medusa inventory-items / reservations / stock-locations 호출/래핑(로직 복사 X).
 *  - inventory-items: 재고 아이템 목록 + 위치별 수량(location_levels).
 *  - reservations: 예약(주문 확정 전 선점) 목록.
 *  - stock-locations: 물류 창고/위치 목록.
 *  - 재고 조정: POST /admin/inventory-items/{id}/location-levels/{location_id} (기존 위치 수량 수정)
 *              POST /admin/inventory-items/{id}/location-levels (신규 위치 연결)
 */
import { apiFetch } from "./client";

/** 위치별 재고 레벨 */
export type LocationLevel = {
  id: string;
  location_id: string;
  inventory_item_id: string;
  stocked_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
};

/** 재고 아이템 */
export type InventoryItem = {
  id: string;
  sku: string | null;
  title: string | null;
  stocked_quantity: number;
  reserved_quantity: number;
  location_levels: LocationLevel[];
};

/** 예약 아이템 */
export type ReservationItem = {
  id: string;
  location_id: string;
  inventory_item_id: string;
  quantity: number;
  line_item_id: string | null;
  description: string | null;
  created_at: string;
  inventory_item?: {
    id: string;
    sku: string | null;
    title: string | null;
  };
};

/** 재고 위치(창고) */
export type StockLocation = {
  id: string;
  name: string;
  address?: {
    city?: string | null;
    country_code?: string | null;
    address_1?: string | null;
  } | null;
};

const INVENTORY_FIELDS =
  "id,sku,title,stocked_quantity,reserved_quantity,*location_levels";

/** 재고 아이템 목록 조회 */
export async function listInventoryItems(params?: {
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<{ inventory_items: InventoryItem[]; count: number }> {
  const qs = new URLSearchParams();
  qs.set("fields", INVENTORY_FIELDS);
  qs.set("limit", String(params?.limit ?? 20));
  qs.set("offset", String(params?.offset ?? 0));
  if (params?.q) qs.set("q", params.q);
  return apiFetch(`/admin/inventory-items?${qs.toString()}`);
}

/** 예약 목록 조회 */
export async function listReservations(params?: {
  limit?: number;
  offset?: number;
}): Promise<{ reservations: ReservationItem[]; count: number }> {
  const qs = new URLSearchParams();
  qs.set("limit", String(params?.limit ?? 50));
  qs.set("offset", String(params?.offset ?? 0));
  return apiFetch(`/admin/reservations?${qs.toString()}`);
}

/** 재고 위치(창고) 목록 조회 */
export async function listStockLocations(): Promise<{ stock_locations: StockLocation[]; count: number }> {
  return apiFetch(`/admin/stock-locations?limit=100`);
}

/**
 * 기존 위치에 재고 수량 수정.
 * POST /admin/inventory-items/{id}/location-levels/{location_id}
 */
export async function updateLocationLevel(
  inventoryItemId: string,
  locationId: string,
  stockedQuantity: number,
): Promise<unknown> {
  return apiFetch(
    `/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
    {
      method: "POST",
      body: JSON.stringify({ stocked_quantity: stockedQuantity }),
    },
  );
}

/**
 * 신규 위치에 재고 아이템 연결(위치 레벨 생성).
 * POST /admin/inventory-items/{id}/location-levels
 */
export async function createLocationLevel(
  inventoryItemId: string,
  locationId: string,
  stockedQuantity: number,
): Promise<unknown> {
  return apiFetch(`/admin/inventory-items/${inventoryItemId}/location-levels`, {
    method: "POST",
    body: JSON.stringify({ location_id: locationId, stocked_quantity: stockedQuantity }),
  });
}
