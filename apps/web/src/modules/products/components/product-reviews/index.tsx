import { listProductReviews, type ProductReview } from "@lib/data/reviews"
import { formatDate } from "@lib/util/format-date"
import { getT, getUiLocale } from "@lib/i18n"
import ReviewForm from "@modules/products/components/review-form"

// 별점 표시 (★ 채움 / ☆ 빈칸)
// async 인 이유: aria-label 을 번역해야 해서. RSC 는 async 컴포넌트를 그대로 렌더한다.
const Stars = async ({ rating }: { rating: number }) => {
  const t = await getT()
  const full = Math.round(rating)
  return (
    <span className="text-ui-tag-orange-icon" aria-label={t("review.ratingAria", { n: rating })}>
      {"★".repeat(full)}
      <span className="text-ui-fg-muted">{"☆".repeat(Math.max(0, 5 - full))}</span>
    </span>
  )
}



const ReviewItem = async ({ review }: { review: ProductReview }) => {
  const t = await getT()
  return (
  <li className="border-b border-ui-border-base py-5 last:border-b-0">
    <div className="flex items-center justify-between">
      <Stars rating={review.rating} />
      <span className="txt-small text-ui-fg-muted">{formatDate(await getUiLocale(), review.created_at)}</span>
    </div>
    {review.title && (
      <p className="txt-medium-plus mt-2">
        {review.title}
        {review.has_photo && (
          <span className="ml-2 txt-small text-ui-fg-interactive">{t("review.photo")}</span>
        )}
      </p>
    )}
    <p className="txt-medium text-ui-fg-subtle mt-1 whitespace-pre-line">{review.content}</p>
    <p className="txt-small text-ui-fg-muted mt-2">{review.author}</p>
  </li>
  )
}

const ProductReviews = async ({ productId }: { productId: string }) => {
  const t = await getT()
  const { reviews, summary } = await listProductReviews(productId)

  return (
    <div className="w-full" data-testid="product-reviews">
      <div className="flex items-baseline gap-x-3 mb-6">
        <h2 className="text-2xl-semi">{t("review.sectionTitle")}</h2>
        <span className="txt-medium text-ui-fg-muted">({summary.count})</span>
      </div>

      {summary.count === 0 ? (
        <p className="txt-medium text-ui-fg-muted py-10 text-center">
          {t("review.empty")}
        </p>
      ) : (
        <div className="flex flex-col small:flex-row gap-8">
          {/* 요약: 평균 별점 + 분포 */}
          <div className="small:w-64 shrink-0 rounded-lg border border-ui-border-base p-6">
            <div className="flex items-end gap-x-2">
              <span className="text-4xl font-semibold">{summary.average.toFixed(1)}</span>
              <span className="txt-small text-ui-fg-muted pb-1">/ 5</span>
            </div>
            <Stars rating={summary.average} />
            <ul className="mt-4 flex flex-col gap-y-1">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const n = summary.distribution[star]
                const pct = summary.count ? (n / summary.count) * 100 : 0
                return (
                  <li key={star} className="flex items-center gap-x-2 txt-small">
                    <span className="w-8 text-ui-fg-muted">{t("review.starCount", { n: star })}</span>
                    <span className="flex-1 h-2 rounded bg-ui-bg-subtle overflow-hidden">
                      <span
                        className="block h-full bg-ui-tag-orange-icon"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-6 text-right text-ui-fg-muted">{n}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* 리뷰 목록 */}
          <ul className="flex-1">
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ul>
        </div>
      )}

      <ReviewForm productId={productId} />
    </div>
  )
}

export default ProductReviews
