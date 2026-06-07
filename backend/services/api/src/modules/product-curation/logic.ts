/**
 * 상품 큐레이션(Product Curation) 순수 로직 — DB 무관, 집계/필터 계산 전용.
 *
 * 정책 수치는 코드에 박지 않고 호출자가 주입하거나 TODO(사장님결정) 로 표시한다.
 *
 *  - 인기 검색어 노출 기준: 금칙어(is_banned) 제외 + count DESC 정렬
 *  - 조회수 상위 상품 필터: count DESC 상위 N개
 *  - 위시리스트 집계: 상품별 위시 수 계산
 *  - 금칙어 포함 여부: 검색어/상품명에 금칙어 포함 여부 판정
 */

export type BannedWordScope = "all" | "search" | "product_name" | "review"

/**
 * 인기 검색어 목록 필터링.
 *  - 금칙어(is_banned = true) 제외
 *  - count DESC 정렬
 *  - limit 개만 반환
 * TODO(사장님결정): 기준 기간(최근 N일) 필터 적용 여부 결정.
 */
export function filterPopularTerms(
  terms: Array<{ term: string; count: number; is_banned: boolean }>,
  limit: number = 10  // TODO(사장님결정): 기본 노출 개수(현재 10개)
): Array<{ term: string; count: number }> {
  return terms
    .filter((t) => !t.is_banned)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ term, count }) => ({ term, count }))
}

/**
 * 조회수 상위 N개 상품 추출.
 *  - count DESC 정렬 후 limit 개만 반환.
 * TODO(사장님결정): 기준 기간(최근 N일) 필터 적용 여부 결정.
 */
export function topViewedProducts(
  viewCounts: Array<{ product_id: string; count: number }>,
  limit: number = 20  // TODO(사장님결정): 기본 노출 개수(현재 20개)
): Array<{ product_id: string; count: number }> {
  return [...viewCounts]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * 위시리스트 집계 — 상품별 위시 수 계산.
 *  - 입력: 위시리스트 항목 배열 (product_id, customer_id)
 *  - 출력: 상품별 위시 수 { product_id, wishCount }, count DESC 정렬.
 */
export function aggregateWishlistByProduct(
  wishlistItems: Array<{ product_id: string; customer_id: string }>
): Array<{ product_id: string; wishCount: number }> {
  const map = new Map<string, number>()
  for (const item of wishlistItems) {
    map.set(item.product_id, (map.get(item.product_id) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([product_id, wishCount]) => ({ product_id, wishCount }))
    .sort((a, b) => b.wishCount - a.wishCount)
}

/**
 * 금칙어 포함 여부 판정.
 *  - text 에 bannedWords 중 scope 에 해당하는 금칙어가 포함되어 있으면 true.
 *  - 대소문자 무시(toLowerCase 정규화).
 *  - scope = "all" 인 금칙어는 모든 contextScope 에서 차단.
 *
 * @param text       검사할 텍스트(상품명, 검색어 등)
 * @param bannedWords 금칙어 목록
 * @param contextScope 현재 컨텍스트("search" | "product_name" | "review")
 */
export function containsBannedWord(
  text: string,
  bannedWords: Array<{ word: string; scope: BannedWordScope }>,
  contextScope: Exclude<BannedWordScope, "all">
): boolean {
  const lower = text.toLowerCase()
  return bannedWords.some((bw) => {
    if (bw.scope !== "all" && bw.scope !== contextScope) return false
    return lower.includes(bw.word.toLowerCase())
  })
}

/**
 * 검색어 정규화 — 앞뒤 공백 제거 + 소문자 변환 + 연속 공백 단일화.
 * 빈 문자열이면 null 반환(저장 불필요 신호).
 */
export function normalizeSearchTerm(raw: string): string | null {
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, " ")
  return normalized.length > 0 ? normalized : null
}
