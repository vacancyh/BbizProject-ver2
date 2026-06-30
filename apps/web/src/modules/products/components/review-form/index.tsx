"use client"

import { Button, clx } from "@modules/common/components/ui"
import { createProductReview } from "@lib/data/reviews"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

const ReviewForm = ({ productId }: { productId: string }) => {
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
      setError("리뷰 내용을 5자 이상 입력해 주세요.")
      return
    }
    startTransition(async () => {
      try {
        await createProductReview(productId, {
          author_name: author.trim() || "익명",
          rating,
          title: title.trim() || undefined,
          content: content.trim(),
        })
        setDone(true)
        setTitle("")
        setContent("")
        router.refresh()
      } catch {
        setError("리뷰 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.")
      }
    })
  }

  if (done) {
    return (
      <div className="mt-8 rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 text-center">
        <p className="text-base-regular text-ui-fg-base">
          리뷰가 등록되었습니다. 운영자 검수 후 게시됩니다. 감사합니다!
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
          리뷰 작성하기
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
      <h3 className="text-large-semi">리뷰 작성</h3>

      {/* 별점 */}
      <div className="flex items-center gap-x-2">
        <span className="text-small-regular text-ui-fg-subtle">별점</span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              aria-label={`${s}점`}
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
        placeholder="작성자명 (선택)"
        className="border-b border-ui-border-base bg-transparent py-2 text-base-regular outline-none focus:border-ui-fg-base"
        data-testid="review-author"
      />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목 (선택)"
        className="border-b border-ui-border-base bg-transparent py-2 text-base-regular outline-none focus:border-ui-fg-base"
        data-testid="review-title"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="상품은 어떠셨나요? 솔직한 후기를 남겨주세요. (5자 이상)"
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
          취소
        </Button>
        <Button
          type="submit"
          className="rounded-none"
          isLoading={isPending}
          data-testid="submit-review"
        >
          등록
        </Button>
      </div>
    </form>
  )
}

export default ReviewForm
