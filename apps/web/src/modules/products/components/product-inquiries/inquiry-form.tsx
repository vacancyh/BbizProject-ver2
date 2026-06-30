"use client"

import { Button } from "@modules/common/components/ui"
import { createProductInquiry } from "@lib/data/inquiries"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

const InquiryForm = ({ productId }: { productId: string }) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [author, setAuthor] = useState("")
  const [content, setContent] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (content.trim().length < 5) {
      setError("문의 내용을 5자 이상 입력해 주세요.")
      return
    }
    startTransition(async () => {
      try {
        await createProductInquiry(productId, {
          author_name: author.trim() || "익명",
          content: content.trim(),
        })
        setDone(true)
        setContent("")
        router.refresh()
      } catch {
        setError("문의 등록에 실패했습니다. 잠시 후 다시 시도해 주세요.")
      }
    })
  }

  if (done) {
    return (
      <div className="mt-6 rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 text-center">
        <p className="text-base-regular text-ui-fg-base">
          문의가 등록되었습니다. 운영자 확인 후 답변드리겠습니다.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="mt-6">
        <Button
          variant="secondary"
          className="rounded-none"
          onClick={() => setOpen(true)}
          data-testid="open-inquiry-form"
        >
          상품 문의하기
        </Button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 rounded-rounded border border-ui-border-base p-6 flex flex-col gap-y-4"
      data-testid="inquiry-form"
    >
      <h3 className="text-large-semi">상품 문의 작성</h3>
      <input
        type="text"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="작성자명 (선택)"
        className="border-b border-ui-border-base bg-transparent py-2 text-base-regular outline-none focus:border-ui-fg-base"
        data-testid="inquiry-author"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="상품에 대해 궁금한 점을 남겨주세요. (5자 이상)"
        rows={4}
        required
        className="border border-ui-border-base rounded-rounded bg-transparent p-3 text-base-regular outline-none focus:border-ui-fg-base resize-none"
        data-testid="inquiry-content"
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
          data-testid="submit-inquiry"
        >
          등록
        </Button>
      </div>
    </form>
  )
}

export default InquiryForm
