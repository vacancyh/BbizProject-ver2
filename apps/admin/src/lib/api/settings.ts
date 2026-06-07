/**
 * 쇼핑몰 설정 — Medusa store 기준정보 호출/래핑(로직 복사 X). 한국 단독몰 기준.
 *  - 기준정보: 스토어명 + 로고(브랜드 사이드바 연동). store.metadata.logo_url.
 *  - 상품군 선택: 최초 납품 시 취급 상품군 선택 → store.metadata.active_catalog_types(분야 id 목록).
 *    선택한 상품군에 따라 상품유형·고시 항목이 결정됨(상품 분류 체계 모듈과 연계).
 *  - 통화: 한국(KRW) 고정 — 선택 UI 없음. 판매 채널: 단독몰이라 미사용.
 *  - 지역: 한국 기준(읽기).
 *  - add-currencies / add-locales: spec t001 §5 A2 래핑 (POST /admin/stores/:id/currencies).
 */
import { apiFetch } from "./client";

export type StoreMetadata = {
  logo_url?: string;
  active_catalog_types?: string[];
  [k: string]: unknown;
};
export type StoreSettings = {
  id: string;
  name: string;
  metadata: StoreMetadata | null;
};
export type RegionInfo = { id: string; name: string; currency_code: string; countries?: { iso_2: string; display_name: string }[] };
/** 상품군(분야) = catalog-types 최상위 노드. */
export type CatalogType = { id: string; name: string };

/** 스토어 기준정보 1건(이름 + 메타데이터). */
export async function getStoreSettings(): Promise<StoreSettings> {
  const { stores } = await apiFetch<{ stores: StoreSettings[] }>(`/admin/stores?fields=id,name,metadata`);
  return stores[0];
}

/** 스토어 갱신 — name / metadata 부분 패치. metadata 는 호출부에서 병합한 전체를 전달. */
export function updateStore(id: string, patch: { name?: string; metadata?: StoreMetadata }): Promise<{ store: StoreSettings }> {
  return apiFetch(`/admin/stores/${id}`, { method: "POST", body: JSON.stringify(patch) });
}

/** 상품군(분야) 목록 — catalog-types 최상위 노드. */
export async function listCatalogTypes(): Promise<CatalogType[]> {
  const { product_types } = await apiFetch<{ product_types: { id: string; name: string; parent_id: string | null }[] }>(
    `/admin/catalog-types`
  );
  return (product_types ?? []).filter((t) => !t.parent_id).map((t) => ({ id: t.id, name: t.name }));
}

/** 지역 목록(읽기). */
export async function listRegions(): Promise<RegionInfo[]> {
  const { regions } = await apiFetch<{ regions: RegionInfo[] }>(
    `/admin/regions?limit=100&fields=id,name,currency_code,*countries`
  );
  return regions;
}

/**
 * 지역 갱신 — spec t002 §5 A2 (POST /admin/regions/:id 래핑).
 * 단독몰 기준: name / currency_code 부분 패치.
 */
export function updateRegion(
  id: string,
  patch: { name?: string; currency_code?: string }
): Promise<{ region: RegionInfo }> {
  return apiFetch(`/admin/regions/${id}`, {
    method: "POST",
    body: JSON.stringify(patch),
  });
}

/**
 * 스토어 지원통화 추가 — spec t001 §5 A2 (POST /admin/stores/:id/currencies).
 * 단독몰 기준 KRW 고정이지만 spec 요구 API 래핑 의무로 노출.
 */
export function addStoreCurrencies(
  storeId: string,
  currencyCodes: string[]
): Promise<{ store: StoreSettings }> {
  return apiFetch(`/admin/stores/${storeId}/currencies`, {
    method: "POST",
    body: JSON.stringify({ currency_codes: currencyCodes }),
  });
}

/**
 * 스토어 지원 로케일 추가 — store.metadata.supported_locales 에 병합 후 updateStore 호출.
 * Medusa v2 에 /admin/stores/:id/locales 엔드포인트가 없으므로 metadata 패치로 구현.
 */
export async function addStoreLocales(
  storeId: string,
  locales: string[],
  existingMetadata: StoreMetadata
): Promise<{ store: StoreSettings }> {
  const existing: string[] = Array.isArray(existingMetadata.supported_locales)
    ? (existingMetadata.supported_locales as string[])
    : [];
  const merged = Array.from(new Set([...existing, ...locales]));
  return apiFetch(`/admin/stores/${storeId}`, {
    method: "POST",
    body: JSON.stringify({
      metadata: { ...existingMetadata, supported_locales: merged },
    }),
  });
}
