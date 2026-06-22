// 상품 리뷰 데이터 계층 (mock-우선)
// ─────────────────────────────────────────────────────────────
// 백엔드에 store용 리뷰 조회 API가 아직 없음(관리자 review 모듈은 존재하나 스토어 노출 X).
// 팀 합의: "계약(타입/시그니처) 먼저 → mock 반환 → 화면 진행", 백엔드 준비 시 fetch만 교체.
// 교체 지점: listProductReviews 내부 TODO(backend) 참고.
// 이 파일은 신규 도메인(reviews/wishlist/points 등)의 표준 템플릿 역할.

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

// 결정적(deterministic) mock — SSR 스냅샷 안정성을 위해 랜덤/현재시각 미사용
const MOCK_REVIEWS: Omit<ProductReview, "product_id">[] = [
  {
    id: "rev_mock_1",
    author: "김**",
    rating: 5,
    title: "재구매 의사 100%",
    content: "배송도 빠르고 품질이 기대 이상이에요. 주변에 추천했습니다.",
    created_at: "2026-05-21T09:12:00.000Z",
    has_photo: true,
  },
  {
    id: "rev_mock_2",
    author: "이**",
    rating: 4,
    title: "무난하게 좋아요",
    content: "가격 대비 만족합니다. 색상이 사진과 약간 다른 점만 참고하세요.",
    created_at: "2026-05-18T03:40:00.000Z",
  },
  {
    id: "rev_mock_3",
    author: "박**",
    rating: 5,
    content: "사이즈 딱 맞고 마감도 깔끔합니다. 다음에 또 살게요!",
    created_at: "2026-05-10T11:05:00.000Z",
    has_photo: true,
  },
  {
    id: "rev_mock_4",
    author: "최**",
    rating: 3,
    title: "보통이에요",
    content: "기능은 괜찮은데 포장이 조금 아쉬웠어요.",
    created_at: "2026-04-29T07:22:00.000Z",
  },
  {
    id: "rev_mock_5",
    author: "정**",
    rating: 5,
    title: "강력 추천",
    content: "이 가격에 이 정도 퀄리티면 무조건 사야 합니다. 만족!",
    created_at: "2026-04-20T15:48:00.000Z",
  },
]

export async function listProductReviews(
  productId: string
): Promise<ProductReviewsResult> {
  // TODO(backend): store 리뷰 API 준비 시 아래 mock을 교체.
  //   const { reviews } = await sdk.client.fetch(`/store/products/${productId}/reviews`, {
  //     headers: { ...(await getAuthHeaders()) },
  //     next: { tags: [`reviews-${productId}`] },
  //   })
  const reviews: ProductReview[] = MOCK_REVIEWS.map((r) => ({
    ...r,
    product_id: productId,
  }))

  const distribution: Record<ReviewRatingKey, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let sum = 0
  for (const r of reviews) {
    sum += r.rating
    distribution[r.rating as ReviewRatingKey] += 1
  }
  const count = reviews.length
  const average = count ? Math.round((sum / count) * 10) / 10 : 0

  return { reviews, summary: { average, count, distribution } }
}
