/**
 * 배송 관리 API 호출 레이어 — Medusa REST 호출/래핑(로직 복사 X).
 *  - 출고지/창고  = /admin/stock-locations (+address, fulfillment_sets, service_zones)
 *  - 배송 프로파일 = /admin/shipping-profiles
 *  - 서비스 구역  = /admin/fulfillment-sets/:id/service-zones (geo_zones=국가)
 *  - 배송 옵션·배송비 = /admin/shipping-options (price_type flat, prices[currency,amount])
 *  - 국내 택배사(GAP_B) = store.metadata 영속(실 택배사 API 연동은 mock — 미구현).
 * 통화 하드코딩 금지: 배송비 통화는 store 지원통화에서 선택. 배송비 계산은 Medusa 코어.
 */
import { apiFetch } from "./client";

// ───────────────────────── 출고지/창고 ─────────────────────────
export type ShipAddress = {
  address_1?: string;
  address_2?: string | null;
  city?: string;
  country_code?: string;
  postal_code?: string;
  province?: string | null;
  phone?: string | null;
  company?: string | null;
};

export type GeoZone = { id?: string; type: string; country_code?: string };
export type ServiceZone = { id: string; name: string; geo_zones?: GeoZone[] };
export type FulfillmentSet = { id: string; name: string; type: string; service_zones?: ServiceZone[] };
export type StockLocation = {
  id: string;
  name: string;
  address?: ShipAddress | null;
  fulfillment_sets?: FulfillmentSet[];
};

const LOC_FIELDS =
  "id,name,*address," +
  "fulfillment_sets.id,fulfillment_sets.name,fulfillment_sets.type," +
  "fulfillment_sets.service_zones.id,fulfillment_sets.service_zones.name," +
  "fulfillment_sets.service_zones.geo_zones.id,fulfillment_sets.service_zones.geo_zones.type,fulfillment_sets.service_zones.geo_zones.country_code";

/** 출고지/창고 목록(주소·배송 셋·서비스 구역 포함). */
export function listStockLocations(): Promise<{ stock_locations: StockLocation[]; count: number }> {
  const qs = new URLSearchParams({ fields: LOC_FIELDS, limit: "100" });
  return apiFetch(`/admin/stock-locations?${qs.toString()}`);
}

/** 출고지 상세. */
export function getStockLocation(id: string): Promise<{ stock_location: StockLocation }> {
  const qs = new URLSearchParams({ fields: LOC_FIELDS });
  return apiFetch(`/admin/stock-locations/${id}?${qs.toString()}`);
}

/** 출고지 생성. */
export function createStockLocation(input: { name: string; address: ShipAddress }): Promise<{ stock_location: StockLocation }> {
  return apiFetch(`/admin/stock-locations`, { method: "POST", body: JSON.stringify(input) });
}

/** 출고지 수정(명/주소). */
export function updateStockLocation(
  id: string,
  patch: { name?: string; address?: ShipAddress }
): Promise<{ stock_location: StockLocation }> {
  return apiFetch(`/admin/stock-locations/${id}`, { method: "POST", body: JSON.stringify(patch) });
}

/** 출고지 삭제(soft-delete). */
export function deleteStockLocation(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/stock-locations/${id}`, { method: "DELETE" });
}

/** 출고지에 배송 공급자 활성화(배송 옵션 생성 전 필수). */
export function enableLocationProvider(locId: string, providerId: string): Promise<{ stock_location: StockLocation }> {
  return apiFetch(`/admin/stock-locations/${locId}/fulfillment-providers`, {
    method: "POST",
    body: JSON.stringify({ add: [providerId] }),
  });
}

/** 출고지에 배송 셋(fulfillment set) 생성. 생성 후 getStockLocation 으로 재조회 필요. */
export function createFulfillmentSet(locId: string, name: string): Promise<{ stock_location: StockLocation }> {
  return apiFetch(`/admin/stock-locations/${locId}/fulfillment-sets`, {
    method: "POST",
    body: JSON.stringify({ name, type: "shipping" }),
  });
}

// ───────────────────────── 서비스 구역 ─────────────────────────
/** 배송 셋에 서비스 구역 생성(국가 기반 geo_zones). */
export function createServiceZone(
  fsId: string,
  name: string,
  countryCodes: string[]
): Promise<{ fulfillment_set: FulfillmentSet }> {
  return apiFetch(`/admin/fulfillment-sets/${fsId}/service-zones`, {
    method: "POST",
    body: JSON.stringify({ name, geo_zones: countryCodes.map((c) => ({ type: "country", country_code: c })) }),
  });
}

/** 서비스 구역 삭제. */
export function deleteServiceZone(fsId: string, szId: string): Promise<unknown> {
  return apiFetch(`/admin/fulfillment-sets/${fsId}/service-zones/${szId}`, { method: "DELETE" });
}

// ───────────────────────── 배송 프로파일 ─────────────────────────
export type ShippingProfile = { id: string; name: string; type: string };

/** 배송 프로파일 목록. */
export function listShippingProfiles(): Promise<{ shipping_profiles: ShippingProfile[]; count: number }> {
  return apiFetch(`/admin/shipping-profiles?fields=id,name,type&limit=100`);
}

/** 배송 프로파일 생성. */
export function createShippingProfile(input: { name: string; type: string }): Promise<{ shipping_profile: ShippingProfile }> {
  return apiFetch(`/admin/shipping-profiles`, { method: "POST", body: JSON.stringify(input) });
}

// ───────────────────────── 배송 공급자 ─────────────────────────
export type FulfillmentProvider = { id: string; is_enabled: boolean };

/** 배송 공급자 목록(Medusa 기본 manual_manual). */
export function listFulfillmentProviders(): Promise<{ fulfillment_providers: FulfillmentProvider[]; count: number }> {
  return apiFetch(`/admin/fulfillment-providers?limit=50`);
}

// ───────────────────────── 배송 옵션·배송비 ─────────────────────────
export type ShipOptionPrice = { id?: string; currency_code: string; amount: number };
export type ShippingOption = {
  id: string;
  name: string;
  price_type: "flat" | "calculated";
  service_zone_id: string;
  provider_id: string;
  shipping_profile_id: string;
  prices?: ShipOptionPrice[];
};

const SO_FIELDS =
  "id,name,price_type,service_zone_id,provider_id,shipping_profile_id,prices.id,prices.currency_code,prices.amount";

/** 배송 옵션 목록(서비스 구역별 필터 가능). */
export function listShippingOptions(serviceZoneId?: string): Promise<{ shipping_options: ShippingOption[]; count: number }> {
  const qs = new URLSearchParams({ fields: SO_FIELDS, limit: "200" });
  if (serviceZoneId) qs.set("service_zone_id", serviceZoneId);
  return apiFetch(`/admin/shipping-options?${qs.toString()}`);
}

/** 배송 옵션 생성(flat 정액 배송비 + 표준 규칙). */
export function createShippingOption(input: {
  name: string;
  serviceZoneId: string;
  shippingProfileId: string;
  providerId: string;
  prices: ShipOptionPrice[];
}): Promise<{ shipping_option: ShippingOption }> {
  return apiFetch(`/admin/shipping-options`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      service_zone_id: input.serviceZoneId,
      shipping_profile_id: input.shippingProfileId,
      provider_id: input.providerId,
      price_type: "flat",
      type: { label: input.name, description: input.name, code: "standard" },
      prices: input.prices.map((p) => ({ currency_code: p.currency_code, amount: p.amount })),
      rules: [
        { attribute: "enabled_in_store", operator: "eq", value: "true" },
        { attribute: "is_return", operator: "eq", value: "false" },
      ],
    }),
  });
}

/** 배송 옵션 삭제. */
export function deleteShippingOption(id: string): Promise<{ id: string; deleted: boolean }> {
  return apiFetch(`/admin/shipping-options/${id}`, { method: "DELETE" });
}

// ───────────────── 국내 택배사(GAP_B · store.metadata 영속) ─────────────────
/** 국내 택배사 카탈로그(고정) — 실제 택배사 API 연동은 미구현(mock). */
export const KR_CARRIERS: { code: string; name: string }[] = [
  { code: "cj", name: "CJ대한통운" },
  { code: "epost", name: "우체국택배" },
  { code: "hanjin", name: "한진택배" },
  { code: "lotte", name: "롯데택배" },
  { code: "logen", name: "로젠택배" },
];

export type KrDeliveryConfig = {
  default_carrier: string;
  enabled_carriers: string[];
  updated_at?: string;
};

export type StoreInfo = {
  id: string;
  name: string;
  metadata: Record<string, unknown> | null;
  supported_currencies: { currency_code: string; is_default: boolean }[];
};

/** 스토어 정보(지원 통화·metadata). */
export async function getStore(): Promise<StoreInfo> {
  const qs = new URLSearchParams({
    fields: "id,name,metadata,supported_currencies.currency_code,supported_currencies.is_default",
  });
  const { stores } = await apiFetch<{ stores: StoreInfo[] }>(`/admin/stores?${qs.toString()}`);
  return stores[0];
}

/** 국내 택배사 설정 조회(store.metadata.kr_delivery). */
export function readKrDelivery(store: StoreInfo): KrDeliveryConfig {
  const raw = (store.metadata?.kr_delivery as KrDeliveryConfig | undefined) ?? undefined;
  return {
    default_carrier: raw?.default_carrier ?? "cj",
    enabled_carriers: raw?.enabled_carriers ?? KR_CARRIERS.map((c) => c.code),
    updated_at: raw?.updated_at,
  };
}

/** 국내 택배사 설정 저장(기존 metadata 병합 후 store 갱신). */
export function saveKrDelivery(store: StoreInfo, cfg: KrDeliveryConfig, updatedAt: string): Promise<{ store: StoreInfo }> {
  const metadata = { ...(store.metadata ?? {}), kr_delivery: { ...cfg, updated_at: updatedAt } };
  return apiFetch(`/admin/stores/${store.id}`, { method: "POST", body: JSON.stringify({ metadata }) });
}

// ───────────────────────── 일괄발송 (bulk-ship) ─────────────────────────

/** 일괄발송 요청 1건 */
export type BulkShipRequestItem = {
  order_id: string;
  /** 출고 ID (미전달 시 서버에서 활성 fulfillment 자동 탐색) */
  fulfillment_id?: string | null;
  /** 택배사 코드 (cj | epost | hanjin | lotte | logen) */
  carrier_code: string;
  /** 운송장번호 (하이픈 허용) */
  tracking_number: string;
  /** 대상 라인 아이템 (미전달 시 전체 항목) */
  items?: { id: string; quantity: number }[] | null;
};

/** 일괄발송 처리 결과 — 성공 1건 */
export type BulkShipProcessed = {
  order_id: string;
  fulfillment_id: string;
  carrier_code: string;
  tracking_number: string;
};

/** 일괄발송 처리 결과 — 실패 1건 */
export type BulkShipError = {
  order_id: string;
  error: string;
};

/** 일괄발송 응답 */
export type BulkShipResponse = {
  processed_count: number;
  error_count: number;
  processed: BulkShipProcessed[];
  errors: BulkShipError[];
};

/**
 * 일괄발송 실행 (한국형 wrap — POST /admin/orders-kr/bulk-ship).
 *
 * 부분 성공 가능: processed/errors 배열로 각각 결과 반환.
 * 최대 100건까지 처리.
 *
 * spec: d6 배송관리 — bulk-ship
 */
export function bulkShip(items: BulkShipRequestItem[]): Promise<BulkShipResponse> {
  return apiFetch("/admin/orders-kr/bulk-ship", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}
