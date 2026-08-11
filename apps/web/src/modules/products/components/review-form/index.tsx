"use client"

import { useT } from "@lib/i18n/client"
import { Button, clx } from "@modules/common/components/ui"
import { createProductReview } from "@lib/data/reviews"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

const ReviewForm = ({ productId }: { productId: string }) => {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (content.trim().length < 5) {
      setError(t("review.tooShort"))
      return
    }
    startTransition(async () => {
      try {
        await createProductReview(productId, {
          author_name: author.trim() || t("product.anonymous"),
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
        })
        setDone(true)
        setTitle("")
        setContent("")
        router.refresh()
      } catch {
        setError(t("review.failed"))
      }
    })
  }

  if (done) {
    return (
      <div className="mt-8 rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 text-center">
        <p className="text-base-regular text-ui-fg-base">
          {t("review.done")}
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="mt-8">
        <Button
          variant="secondary"
          className="rounded-none"
          onClick={() => setOpen(true)}
          data-testid="open-review-form"
        >
          {t("review.openForm")}
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-rounded border border-ui-border-base p-6 flex flex-col gap-y-4"
      data-testid="review-form"
    >
      <h3 className="text-large-semi">{t("review.formTitle")}</h3>

      {/* 별점 */}
      <div className="flex items-center gap-x-2">
        <span className="text-small-regular text-ui-fg-subtle">{t("review.rating")}</span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              aria-label={t("review.starPointAria", { n: s })}
              className={clx(
                "text-2xl leading-none",
                s <= rating ? "text-ui-tag-orange-icon" : "text-ui-fg-muted"
              )}
            >
              ★
            </button>
          ))}
        </div>
        <span className="text-small-regular text-ui-fg-muted">{rating}/5</span>
      </div>

      <input
        type="text"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder={t("review.authorPlaceholder")}
        className="border-b border-ui-border-base bg-transparent py-2 text-base-regular outline-none focus:border-ui-fg-base"
        data-testid="review-author"
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("review.titlePlaceholder")}
        className="border-b border-ui-border-base bg-transparent py-2 text-base-regular outline-none focus:border-ui-fg-base"
        data-testid="review-title"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("review.bodyPlaceholder")}
        rows={4}
        required
        className="border border-ui-border-base rounded-rounded bg-transparent p-3 text-base-regular outline-none focus:border-ui-fg-base resize-none"
        data-testid="review-content"
      />

      {error && (
        <p className="text-small-regular text-ui-tag-red-text">{error}</p>
      )}

      <div className="flex gap-x-2 justify-end">
        <Button
          type="reset"
          variant="secondary"
          className="rounded-none"
          onClick={() => setOpen(false)}
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          className="rounded-none"
          isLoading={isPending}
          data-testid="submit-review"
        >
          {t("review.submit")}
        </Button>
      </div>
    </form>
  )
}

export default ReviewForm
