/**
 * 판매채널 — Medusa sales-channels 호출/래핑(로직 복사 X).
 * 단독몰 = 기본 1채널 운영. 멀티채널 구조를 래핑해 채널-상품 연결 노출.
 *  - GET  /admin/sales-channels           : 채널 목록
 *  - POST /admin/sales-channels           : 채널 생성
 *  - POST /admin/sales-channels/:id       : 채널 편집
 *  - POST /admin/sales-channels/:id/products : 상품 연결(add-products)
 *
 * spec: t003_판매채널.md §6 API 영향
 */
import { apiFetch } from "./client";

// ─── 타입 정의 ─────────────────────────────────────────────────────────────

export type SalesChannel = {
  id: string;
  name: string;
  description: string | null;
  is_disabled: boolean;
  /** 단독몰 기본 채널 판단용 — Medusa metadata 활용 */
  metadata?: { is_default?: boolean; [k: string]: unknown } | null;
};

export type SalesChannelListResponse = {
  sales_channels: SalesChannel[];
  count: number;
  limit: number;
  offset: number;
};

export type CreateChannelInput = {
  name: string;
  description?: string;
  is_disabled?: boolean;
  metadata?: { is_default?: boolean; [k: string]: unknown };
};

export type UpdateChannelInput = {
  name?: string;
  description?: string;
  is_disabled?: boolean;
  metadata?: { is_default?: boolean; [k: string]: unknown };
};

export type AddProductsInput = {
  /** 연결할 product id 목록 */
  product_ids: string[];
};

// ─── API 래퍼 ──────────────────────────────────────────────────────────────

/** 판매채널 목록 조회 — spec API1 GET /admin/sales-channels */
export async function listSalesChannels(): Promise<SalesChannelListResponse> {
  return apiFetch<SalesChannelListResponse>("/admin/sales-channels?limit=100");
}

/** 판매채널 생성 — spec A1 POST /admin/sales-channels */
export async function createSalesChannel(
  input: CreateChannelInput
): Promise<{ sales_channel: SalesChannel }> {
  return apiFetch("/admin/sales-channels", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 판매채널 편집 — spec A1 POST /admin/sales-channels/:id */
export async function updateSalesChannel(
  id: string,
  input: UpdateChannelInput
): Promise<{ sales_channel: SalesChannel }> {
  return apiFetch(`/admin/sales-channels/${id}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 채널-상품 연결(add-products) — spec A2 POST /admin/sales-channels/:id/products */
export async function addProductsToChannel(
  channelId: string,
  input: AddProductsInput
): Promise<{ sales_channel: SalesChannel }> {
  return apiFetch(`/admin/sales-channels/${channelId}/products`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
