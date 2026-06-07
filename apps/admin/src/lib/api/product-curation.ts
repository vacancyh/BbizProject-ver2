/**
 * 상품 통계·큐레이션(Product Curation) API 호출 레이어 — d3 t010.
 *
 * 백엔드 커스텀 모듈(/admin/product-curation/*) 4종 route 호출/래핑(로직 복사 금지).
 * Medusa 코어에 분석/큐레이션 API 없음(GAP_B) → 커스텀 product-curation 모듈 사용.
 *
 *  - view-counts   : 조회수 상위 상품 집계(GET) + 조회수 1 증가(POST)
 *  - wishlists     : 위시 상위 상품 집계(GET) + 위시 토글(POST)
 *  - popular-terms : 인기 검색어 목록(GET) + 검색어 집계 기록(POST)
 *  - banned-words  : 금칙어 목록(GET) + 등록(POST) + 삭제(DELETE)
 *
 * 조회수/위시 집계는 product_id 만 반환하므로, 화면에서는 listProducts 로
 * 상품명을 별도 조회해 매핑한다(buildProductTitleMap).
 */
import { apiFetch } from "./client";

/* ── 조회수(view-counts) ─────────────────────────────────────────────── */

/** 조회수 상위 상품 1건(서비스 getTopViewedProducts 반환 형태) */
export type ViewCountItem = { product_id: string; count: number };

/** 조회수 상위 N개 상품 집계(count DESC). */
export function getViewCounts(limit = 20): Promise<{ view_counts: ViewCountItem[]; count: number }> {
  return apiFetch(`/admin/product-curation/view-counts?limit=${limit}`);
}

/** 특정 상품 조회수 1 증가(관리자/테스트 수동 기록). */
export function recordView(productId: string): Promise<{ view_count: ViewCountItem }> {
  return apiFetch(`/admin/product-curation/view-counts`, {
    method: "POST",
    body: JSON.stringify({ product_id: productId }),
  });
}

/* ── 위시리스트(wishlists) ────────────────────────────────────────────── */

/** 위시 상위 상품 1건(서비스 getTopWishlistedProducts 반환 형태) */
export type WishlistItem = { product_id: string; wishCount: number };

/** 위시 수 상위 N개 상품 집계(wishCount DESC). */
export function getWishlists(limit = 20): Promise<{ wishlists: WishlistItem[]; count: number }> {
  return apiFetch(`/admin/product-curation/wishlists?limit=${limit}`);
}

/** 위시 토글(추가/제거). { added: boolean } 반환. */
export function toggleWishlist(customerId: string, productId: string): Promise<{ added: boolean }> {
  return apiFetch(`/admin/product-curation/wishlists`, {
    method: "POST",
    body: JSON.stringify({ customer_id: customerId, product_id: productId }),
  });
}

/* ── 인기 검색어(popular-terms) ───────────────────────────────────────── */

/** 인기 검색어 1건(금칙어 제외, count DESC) */
export type PopularTermItem = { term: string; count: number };

/** 인기 검색어 목록(금칙어 제외, count DESC). */
export function getPopularTerms(limit = 10): Promise<{ popular_terms: PopularTermItem[]; count: number }> {
  return apiFetch(`/admin/product-curation/popular-terms?limit=${limit}`);
}

/** 검색어 집계 기록(관리자/테스트). 정규화 후 빈 검색어면 백엔드 400. */
export function recordSearch(term: string): Promise<{ popular_term: { id: string; term: string; count: number } }> {
  return apiFetch(`/admin/product-curation/popular-terms`, {
    method: "POST",
    body: JSON.stringify({ term }),
  });
}

/* ── 금칙어(banned-words) ─────────────────────────────────────────────── */

/** 금칙어 적용 범위 — 백엔드 BannedWordScope 와 동일. */
export type BannedWordScope = "all" | "search" | "product_name" | "review";

/** 금칙어 레코드(banned_word 모델). */
export type BannedWord = {
  id: string;
  word: string;
  scope: BannedWordScope;
  created_by: string | null;
};

/** 금칙어 목록(scope 필터 선택). */
export function getBannedWords(scope?: BannedWordScope): Promise<{ banned_words: BannedWord[]; count: number }> {
  const qs = scope ? `?scope=${scope}` : "";
  return apiFetch(`/admin/product-curation/banned-words${qs}`);
}

/** 금칙어 등록. 중복 시 백엔드 409. */
export function addBannedWord(word: string, scope: BannedWordScope = "all"): Promise<{ banned_word: BannedWord }> {
  return apiFetch(`/admin/product-curation/banned-words`, {
    method: "POST",
    body: JSON.stringify({ word, scope }),
  });
}

/** 금칙어 삭제. 미존재 시 백엔드 404. */
export function removeBannedWord(word: string): Promise<{ message: string }> {
  return apiFetch(`/admin/product-curation/banned-words`, {
    method: "DELETE",
    body: JSON.stringify({ word }),
  });
}

/* ── 상품명 매핑 헬퍼 ─────────────────────────────────────────────────── */

/** 조회수/위시 집계의 product_id → 상품명 매핑용 경량 상품 목록. */
export type CurationProduct = { id: string; title: string; thumbnail: string | null; created_at: string };

/**
 * 상품명 매핑용 상품 목록 조회(Medusa REST).
 *  - 조회수/위시 집계는 product_id 만 반환 → 표시용 title 을 별도 조회.
 *  - 신상품 큐레이션(최신순)에도 재사용.
 */
export function listCurationProducts(limit = 100): Promise<{ products: CurationProduct[]; count: number }> {
  const qs = new URLSearchParams({
    fields: "id,title,thumbnail,created_at",
    limit: String(limit),
    offset: "0",
    order: "-created_at",
  });
  return apiFetch(`/admin/products?${qs.toString()}`);
}

/** 상품 목록 → { product_id: title } 룩업 맵. */
export function buildProductTitleMap(products: CurationProduct[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of products) map[p.id] = p.title;
  return map;
}
