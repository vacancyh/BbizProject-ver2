/**
 * 상품 큐레이션 모듈 서비스.
 *
 *  - recordView(productId)         = 상품 조회수 1 증가(없으면 신규 생성)
 *  - getTopViewedProducts(limit)   = 조회수 상위 상품 목록
 *  - toggleWishlist(customerId, productId) = 위시 토글(없으면 추가, 있으면 제거) → { added: boolean }
 *  - getWishlistByCustomer(customerId)     = 고객별 위시리스트 상품 id 목록
 *  - getWishlistCountByProduct(productId) = 상품별 위시 수
 *  - recordSearch(term)            = 검색어 집계(없으면 신규, 있으면 count++)
 *  - getPopularTerms(limit)        = 인기 검색어 목록(금칙어 제외)
 *  - addBannedWord(word, scope, createdBy) = 금칙어 등록
 *  - removeBannedWord(word)        = 금칙어 삭제
 *  - listBannedWords(scope?)       = 금칙어 목록
 *  - checkBannedWord(text, scope)  = 금칙어 포함 여부 검사
 */
import { MedusaService } from "@medusajs/framework/utils"
import ProductViewCount from "./models/product-view-count"
import ProductWishlist from "./models/product-wishlist"
import PopularSearchTerm from "./models/popular-search-term"
import BannedWord from "./models/banned-word"
import {
  filterPopularTerms,
  topViewedProducts,
  aggregateWishlistByProduct,
  rankBestProducts,
  containsBannedWord,
  normalizeSearchTerm,
  type BannedWordScope,
} from "./logic"

class ProductCurationModuleService extends MedusaService({
  ProductViewCount,
  ProductWishlist,
  PopularSearchTerm,
  BannedWord,
}) {
  // ─── 조회수(ViewCount) ─────────────────────────────────────────────────────

  /**
   * 상품 조회수 1 증가.
   * 기존 레코드가 없으면 신규 생성, 있으면 count + 1.
   *
   * @param productId Medusa product.id
   * @returns 갱신된 조회수 레코드
   */
  async recordView(productId: string): Promise<any> {
    const existing = await this.listProductViewCounts({ product_id: productId })
    const now = new Date()

    if (existing.length === 0) {
      // 신규 생성
      const [created] = await this.createProductViewCounts([
        {
          product_id: productId,
          count: 1,
          last_viewed_at: now,
        },
      ])
      return created
    }

    // 기존 레코드 count + 1
    const record = existing[0]
    const [updated] = await this.updateProductViewCounts([
      {
        id: record.id,
        count: Number(record.count) + 1,
        last_viewed_at: now,
      },
    ])
    return updated
  }

  /**
   * 조회수 상위 N개 상품 목록.
   *
   * @param limit 반환 개수(기본 20, 최대 100)
   * @returns { product_id, count }[] count DESC 정렬
   */
  async getTopViewedProducts(limit: number = 20): Promise<
    Array<{ product_id: string; count: number }>
  > {
    const items = await this.listProductViewCounts({})
    const normalized = items.map((r: any) => ({
      product_id: r.product_id as string,
      count: Number(r.count),
    }))
    return topViewedProducts(normalized, Math.min(limit, 100))
  }

  // ─── 위시리스트(Wishlist) ──────────────────────────────────────────────────

  /**
   * 위시리스트 토글.
   *  - 이미 찜한 경우: 제거 → { added: false }
   *  - 찜하지 않은 경우: 추가 → { added: true }
   *
   * @param customerId Medusa customer.id
   * @param productId  Medusa product.id
   */
  async toggleWishlist(
    customerId: string,
    productId: string
  ): Promise<{ added: boolean }> {
    const existing = await this.listProductWishlists({
      customer_id: customerId,
      product_id: productId,
    })

    if (existing.length > 0) {
      // 이미 찜 → 제거
      await this.deleteProductWishlists(existing[0].id)
      return { added: false }
    }

    // 새로 찜
    await this.createProductWishlists([
      { customer_id: customerId, product_id: productId },
    ])
    return { added: true }
  }

  /**
   * 고객별 위시리스트 상품 id 목록.
   *
   * @param customerId Medusa customer.id
   * @returns product_id 문자열 배열
   */
  async getWishlistByCustomer(customerId: string): Promise<string[]> {
    const items = await this.listProductWishlists({ customer_id: customerId })
    return items.map((r: any) => r.product_id as string)
  }

  /**
   * 상품별 위시 수.
   *
   * @param productId Medusa product.id
   * @returns 위시 수(정수)
   */
  async getWishlistCountByProduct(productId: string): Promise<number> {
    const items = await this.listProductWishlists({ product_id: productId })
    return items.length
  }

  /**
   * 위시리스트 상위 N개 상품 집계.
   *
   * @param limit 반환 개수(기본 20)
   * @returns { product_id, wishCount }[] wishCount DESC 정렬
   */
  async getTopWishlistedProducts(limit: number = 20): Promise<
    Array<{ product_id: string; wishCount: number }>
  > {
    const items = await this.listProductWishlists({})
    const mapped = items.map((r: any) => ({
      product_id: r.product_id as string,
      customer_id: r.customer_id as string,
    }))
    const aggregated = aggregateWishlistByProduct(mapped)
    return aggregated.slice(0, Math.min(limit, 100))
  }

  /**
   * 베스트(인기) 상품 랭킹 — 판매수량 + 조회수 + 위시 수 가중 합산.
   * 판매수량(sales)은 기준기간(최근 N일) 주문 집계로, 라우트에서 주입한다
   * (모듈은 코어 order 데이터를 직접 조회하지 않음 — 가드레일).
   *
   * @param limit 반환 개수(기본 20, 최대 100)
   * @param sales [{product_id, qty}] 최근 N일 판매수량(선택)
   * @returns { product_id, score, views, wishCount, sales }[] score DESC
   */
  async getBestProducts(
    limit: number = 20,
    sales: Array<{ product_id: string; qty: number }> = []
  ): Promise<
    Array<{
      product_id: string
      score: number
      views: number
      wishCount: number
      sales: number
    }>
  > {
    const cap = Math.min(Math.max(1, limit), 100)
    const views = (await this.listProductViewCounts({})).map((r: any) => ({
      product_id: r.product_id as string,
      count: Number(r.count),
    }))
    const wishRows = (await this.listProductWishlists({})).map((r: any) => ({
      product_id: r.product_id as string,
      customer_id: r.customer_id as string,
    }))
    const wishlists = aggregateWishlistByProduct(wishRows)
    return rankBestProducts(views, wishlists, sales, cap)
  }

  // ─── 인기 검색어(PopularSearchTerm) ────────────────────────────────────────

  /**
   * 검색어 집계.
   *  - 없으면 신규 생성, 있으면 count + 1.
   *  - normalizeSearchTerm 으로 정규화(공백/소문자).
   *  - 금칙어 체크는 별도(containsBannedWord) — 이 메서드는 무조건 저장.
   *
   * @param rawTerm 검색어 원문
   * @returns 저장된 레코드 또는 null(정규화 후 빈 문자열)
   */
  async recordSearch(rawTerm: string): Promise<any | null> {
    const term = normalizeSearchTerm(rawTerm)
    if (!term) return null

    const existing = await this.listPopularSearchTerms({ term })
    const now = new Date()
    // 금칙어 목록 확인 — 이미 금칙어로 등록된 검색어는 기록 시점에 is_banned 처리
    // (금칙어 등록→이후 검색 순서에서도 인기검색어에서 제외되도록)
    const banned = await this.checkBannedWord(term, "search")

    if (existing.length === 0) {
      const [created] = await this.createPopularSearchTerms([
        { term, count: 1, last_searched_at: now, is_banned: banned },
      ])
      return created
    }

    const record = existing[0]
    const [updated] = await this.updatePopularSearchTerms([
      {
        id: record.id,
        count: Number(record.count) + 1,
        last_searched_at: now,
        is_banned: banned,
      },
    ])
    return updated
  }

  /**
   * 인기 검색어 목록(금칙어 제외).
   *
   * @param limit 반환 개수(기본 10)
   * @param minCount 최소 누적 검색 횟수(기본 1) — 1회성/오타 유입 노출 방지
   * @returns { term, count }[] count DESC 정렬, 금칙어·미달 제외
   */
  async getPopularTerms(
    limit: number = 10,
    minCount: number = 1
  ): Promise<Array<{ term: string; count: number }>> {
    const items = await this.listPopularSearchTerms({})
    const mapped = items.map((r: any) => ({
      term: r.term as string,
      count: Number(r.count),
      is_banned: Boolean(r.is_banned),
    }))
    return filterPopularTerms(mapped, limit, minCount)
  }

  // ─── 금칙어(BannedWord) ───────────────────────────────────────────────────

  /**
   * 금칙어 등록.
   *
   * @param word      금칙어 원문
   * @param scope     적용 범위(기본 "all")
   * @param createdBy 등록 운영자 admin user_id (null = 시스템)
   * @returns 생성된 금칙어 레코드
   */
  async addBannedWord(
    word: string,
    scope: BannedWordScope = "all",
    createdBy: string | null = null
  ): Promise<any> {
    const normalized = word.trim().toLowerCase()
    if (!normalized) throw new Error("[productCuration] 금칙어는 1자 이상이어야 합니다.")

    // 중복 체크
    const existing = await this.listBannedWords({ word: normalized })
    if (existing.length > 0) {
      throw new Error(`[productCuration] 이미 등록된 금칙어입니다: ${normalized}`)
    }

    const [created] = await this.createBannedWords([
      { word: normalized, scope, created_by: createdBy },
    ])

    // 동일 검색어가 인기검색어에 있으면 is_banned 플래그 갱신
    const termRecords = await this.listPopularSearchTerms({ term: normalized })
    if (termRecords.length > 0) {
      await this.updatePopularSearchTerms([
        { id: termRecords[0].id, is_banned: true },
      ])
    }

    return created
  }

  /**
   * 금칙어 삭제.
   *
   * @param word 금칙어 원문(소문자 정규화 후 조회)
   */
  async removeBannedWord(word: string): Promise<void> {
    const normalized = word.trim().toLowerCase()
    const existing = await this.listBannedWords({ word: normalized })
    if (existing.length === 0) {
      throw new Error(`[productCuration] 금칙어를 찾을 수 없습니다: ${normalized}`)
    }
    await this.deleteBannedWords(existing[0].id)

    // 인기검색어의 is_banned 플래그도 해제
    const termRecords = await this.listPopularSearchTerms({ term: normalized })
    if (termRecords.length > 0) {
      await this.updatePopularSearchTerms([
        { id: termRecords[0].id, is_banned: false },
      ])
    }
  }

  /**
   * 금칙어 목록 조회.
   *
   * @param scopeFilter 범위 필터(미지정 = 전체)
   * @returns BannedWord[] 등록순
   */
  async getBannedWords(scopeFilter?: BannedWordScope): Promise<any[]> {
    const filter: Record<string, unknown> = {}
    if (scopeFilter) filter.scope = scopeFilter
    return this.listBannedWords(filter)
  }

  /**
   * 텍스트에 금칙어 포함 여부 검사.
   *
   * @param text         검사 대상 텍스트
   * @param contextScope 현재 컨텍스트("search" | "product_name" | "review")
   * @returns true = 금칙어 포함
   */
  async checkBannedWord(
    text: string,
    contextScope: Exclude<BannedWordScope, "all">
  ): Promise<boolean> {
    const bannedWords = await this.getBannedWords()
    return containsBannedWord(
      text,
      bannedWords.map((bw: any) => ({ word: bw.word as string, scope: bw.scope as BannedWordScope })),
      contextScope
    )
  }
}

export default ProductCurationModuleService
