/**
 * 수기 주문(Draft Orders) API 호출 레이어.
 *  - Medusa REST /admin/draft-orders 직접 호출(래핑만, 로직 복사 X).
 *  - 목록/상세 조회 + 생성(email + region_id 최소 요건).
 */
import { apiFetch } from "./client";

export type DraftOrderListItem = {
  id: string;
  display_id: number;
  status: string;
  email: string | null;
  /** draft-order 는 summary.current_order_total 로 합계 제공 */
  total?: number;
  currency_code?: string;
  created_at: string;
  items?: { quantity: number }[];
};

export type DraftOrderDetail = Omit<DraftOrderListItem, "items"> & {
  region_id?: string | null;
  items?: DraftOrderLineItem[];
  summary?: {
    current_order_total?: number;
    paid_total?: number;
  };
};

export type DraftOrderLineItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  quantity: number;
  unit_price?: number;
  thumbnail?: string | null;
};

export type Region = {
  id: string;
  name: string;
  currency_code: string;
};

const LIST_FIELDS =
  "id,display_id,status,email,created_at,currency_code,*items,*summary";

/** 수기 주문 목록(Medusa REST). */
export function listDraftOrders(params: {
  limit?: number;
  offset?: number;
} = {}): Promise<{ draft_orders: DraftOrderListItem[]; count: number }> {
  const qs = new URLSearchParams({ fields: LIST_FIELDS });
  qs.set("limit", String(params.limit ?? 20));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch(`/admin/draft-orders?${qs.toString()}`);
}

/** 수기 주문 상세(Medusa REST). */
export function getDraftOrder(id: string): Promise<{ draft_order: DraftOrderDetail }> {
  const qs = new URLSearchParams({
    fields: `${LIST_FIELDS},region_id`,
  });
  return apiFetch(`/admin/draft-orders/${id}?${qs.toString()}`);
}

/** 수기 주문 라인 입력(생성 시 함께 전달) */
export type DraftOrderItemInput = {
  variant_id: string;
  quantity: number;
  /** 단가(원) — 미전달 시 코어가 variant 가격 사용 */
  unit_price?: number;
};

/** 수기 주문 배송지 입력 */
export type DraftOrderAddressInput = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_1?: string;
  city?: string;
  postal_code?: string;
  country_code?: string;
};

/**
 * 수기 주문 생성(Medusa REST — email + region_id + items + 배송지).
 * spec: t009_수기주문생성.md §6 API1. items/배송지 함께 전달(코어 AdminCreateDraftOrder).
 */
export function createDraftOrder(params: {
  email: string;
  region_id: string;
  items?: DraftOrderItemInput[];
  shipping_address?: DraftOrderAddressInput;
}): Promise<{ draft_order: DraftOrderDetail }> {
  return apiFetch("/admin/draft-orders", {
    method: "POST",
    body: JSON.stringify({
      email: params.email,
      region_id: params.region_id,
      items: (params.items ?? []).map((it) => ({
        variant_id: it.variant_id,
        quantity: it.quantity,
        ...(it.unit_price != null ? { unit_price: it.unit_price } : {}),
      })),
      ...(params.shipping_address
        ? { shipping_address: params.shipping_address }
        : {}),
    }),
  });
}

/**
 * 수기 주문 → 정식 주문 전환(Medusa REST — convert-to-order).
 * POST /admin/draft-orders/:id/convert-to-order. spec t009 §5 A2.
 */
export function convertDraftOrder(id: string): Promise<{ order: { id: string; display_id: number } }> {
  return apiFetch(`/admin/draft-orders/${id}/convert-to-order`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** 리전 목록(수기 주문 생성 폼용 — Medusa REST). */
export function listRegions(): Promise<{ regions: Region[]; count: number }> {
  return apiFetch("/admin/regions?limit=50&fields=id,name,currency_code");
}
