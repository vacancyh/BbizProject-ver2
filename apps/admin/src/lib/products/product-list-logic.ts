/**
 * 상품 목록 순수 로직 모듈 (d3 t001_상품목록 spec — 필터/노출제어/export)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/lib/api/products.ts 의 listProducts 가 buildProductListQuery 매핑과 정합.
 *   apps/admin/src/app/(admin)/products/page.tsx 의 export 버튼이 productsToCsv 를 호출.
 *
 * 코어 직접호출 원칙(§V0-5): Medusa /admin/products 표준 쿼리만 생성, 커스텀 route 없음.
 */

import type { ProductListItem, VariantPrice } from "@/lib/api/products";

/** 허용된 상품 status 화이트리스트 (Medusa 표준값) */
export const ALLOWED_PRODUCT_STATUSES = [
  "published",
  "draft",
  "proposed",
  "rejected",
] as const;

export type AllowedProductStatus = (typeof ALLOWED_PRODUCT_STATUSES)[number];

/** 목록 조회 파라미터 (필터 포함) */
export type ProductListFilters = {
  /** 키워드 검색 (상품명/handle 부분일치) */
  q?: string;
  /** 상품 상태 필터 — 화이트리스트 외 값은 무시됨 */
  status?: string;
  /** 카테고리 필터 (category_id) */
  categoryId?: string;
  /** 페이지 크기 (기본값: 20) */
  limit?: number;
  /** 오프셋 (기본값: 0) */
  offset?: number;
};

/**
 * 상품 목록 쿼리 객체 생성 순수함수 (t001 §4 노출제어/필터)
 *
 * - status 화이트리스트 검증: 허용 외 값은 쿼리에 포함하지 않음(조용히 무시)
 * - categoryId → category_id[] 매핑
 * - q passthrough
 * - 항상 -updated_at 정렬
 *
 * @returns Medusa /admin/products 에 전달할 쿼리 파라미터 레코드
 */
export function buildProductListQuery(
  filters: ProductListFilters = {}
): Record<string, string> {
  const params: Record<string, string> = {};

  if (filters.q) {
    params["q"] = filters.q;
  }

  if (filters.status) {
    const normalized = filters.status as string;
    if ((ALLOWED_PRODUCT_STATUSES as readonly string[]).includes(normalized)) {
      params["status[]"] = normalized;
    }
    // 화이트리스트 외 값은 조용히 무시
  }

  if (filters.categoryId) {
    params["category_id[]"] = filters.categoryId;
  }

  params["limit"] = String(filters.limit ?? 20);
  params["offset"] = String(filters.offset ?? 0);
  params["order"] = "-updated_at";

  return params;
}

/**
 * 노출(판매중) 여부 판정 — 노출 ON = status "published".
 * 목록 노출제어 토글의 단일 진실 함수.
 */
export function isProductVisible(product: { status: string }): boolean {
  return product.status === "published";
}

/** 대표가격 계산 (지정 통화 우선, 없으면 첫 가격의 최저가) — CSV/표시 공용 */
export function pickRepresentativePrice(
  variants: { prices?: VariantPrice[] }[] | undefined,
  preferred = "krw"
): VariantPrice | null {
  const prices: VariantPrice[] = [];
  for (const v of variants ?? []) for (const p of v.prices ?? []) prices.push(p);
  if (!prices.length) return null;
  const pref = prices.filter((p) => p.currency_code === preferred);
  const pool = pref.length ? pref : prices;
  return pool.reduce((min, p) => (p.amount < min.amount ? p : min), pool[0]);
}

/** CSV 한글 헤더 */
const CSV_HEADERS = [
  "상품ID",
  "상품명",
  "상태",
  "handle",
  "대표가격",
  "통화",
  "카테고리",
  "수정일시",
] as const;

/** CSV 셀 이스케이프 — 콤마/쌍따옴표/개행 포함 시 쌍따옴표로 감싸고 내부 " 는 "" 로 치환. */
function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 상품 목록 → CSV 문자열 변환 순수함수 (t001 export, UT-002 export 템플릿)
 *
 * - UTF-8 BOM 포함 (엑셀 한글 깨짐 방지)
 * - 한글 헤더: 상품ID,상품명,상태,handle,대표가격,통화,카테고리,수정일시
 * - 콤마·쌍따옴표 이스케이프 적용
 */
export function productsToCsv(products: ProductListItem[], preferred = "krw"): string {
  const headerRow = CSV_HEADERS.map(escapeCsvCell).join(",");

  const rows = products.map((p) => {
    const rep = pickRepresentativePrice(p.variants, preferred);
    const categories = (p.categories ?? []).map((c) => c.name).join(" / ");
    const updatedAt = p.updated_at
      ? new Date(p.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false })
      : "";

    return [
      p.id,
      p.title,
      p.status,
      p.handle,
      rep ? String(rep.amount) : "",
      rep ? rep.currency_code : "",
      categories,
      updatedAt,
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  return "﻿" + [headerRow, ...rows].join("\n");
}
