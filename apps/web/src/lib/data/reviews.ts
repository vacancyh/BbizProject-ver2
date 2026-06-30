"use server"

// 상품 리뷰 데이터 계층 (실제 백엔드 연동)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트 `GET /store/products/:id/reviews` 로 공개(published) 리뷰를 조회한다.
// (백엔드: src/api/store/products/[id]/reviews/route.ts · review 모듈)
// 작성(POST)도 동일 경로로 가능(상태 pending → 운영자 검수 후 공개).

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"

export type ProductReview = {
  id: string
  product_id: string
  /** 마스킹된 작성자명 (예: 김**) */
  author: string
  /** 1~5 */
  rating: number
  title?: string
  content: string
  /** ISO 8601 */
  created_at: string
  /** 포토리뷰 여부 */
  has_photo?: boolean
}

export type ReviewRatingKey = 1 | 2 | 3 | 4 | 5

export type ProductReviewSummary = {
  /** 평균 별점 (소수 1자리) */
  average: number
  count: number
  /** 별점별 개수 */
  distribution: Record<ReviewRatingKey, number>
}

export type ProductReviewsResult = {
  reviews: ProductReview[]
  summary: ProductReviewSummary
}

const EMPTY: ProductReviewsResult = {
  reviews: [],
  summary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
}

export async function listProductReviews(
  productId: string
): Promise<ProductReviewsResult> {
  const headers = { ...(await getAuthHeaders()) }
  const next = { ...(await getCacheOptions(`reviews-${productId}`)) }

  try {
    // 백엔드: GET /store/products/:id/reviews → { reviews, summary }
    const result = await sdk.client.fetch<ProductReviewsResult>(
      `/store/products/${productId}/reviews`,
      { method: "GET", headers, next, cache: "force-cache" }
    )
    return result ?? EMPTY
  } catch {
    // 백엔드 일시 오류 시 빈 상태로 안전 폴백(화면 깨짐 방지)
    return EMPTY
  }
}

/** 리뷰 작성(상태 pending → 운영자 검수 후 공개). */
export async function createProductReview(
  productId: string,
  input: { author_name?: string; rating: number; title?: string; content: string }
): Promise<{ pending: boolean }> {
  const headers = { ...(await getAuthHeaders()) }
  await sdk.client.fetch(`/store/products/${productId}/reviews`, {
    method: "POST",
    headers,
    body: input,
  })
  return { pending: true }
}
