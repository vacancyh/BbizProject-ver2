"use client"

import { useState, useTransition } from "react"
import { Button } from "@modules/common/components/ui"
import { submitSupportInquiry } from "@lib/data/support"

const CATEGORIES = ["주문/결제", "배송", "교환/반품", "회원/적립금", "기타"]

/** 1:1 문의(상품무관) 작성 폼 — 고객센터 페이지. */
const SupportInquiryForm = () => {
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0])
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (content.trim().length < 5) {
      setError("문의 내용을 5자 이상 입력해 주세요.")
      return
    }
    startTransition(async () => {
      const res = await submitSupportInquiry({
        author_name: name.trim() || undefined,
        author_email: email.trim(),
        category,
        subject: subject.trim() || undefined,
        content: content.trim(),
      })
      if (res.ok) setDone(true)
      else setError(res.error ?? "접수 실패")
    })
  }

  if (done) {
    return (
      <div
        className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 text-center"
        data-testid="support-done"
      >
        <p className="text-base-regular text-ui-fg-base">
          문의가 접수되었습니다. 입력하신 이메일로 답변드리겠습니다.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <Button
        variant="secondary"
        className="rounded-none"
        onClick={() => setOpen(true)}
        data-testid="open-support-form"
      >
        1:1 문의하기
      </Button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-rounded border border-ui-border-base p-6 flex flex-col gap-y-4"
      data-testid="support-form"
    >
      <h3 className="text-large-semi">1:1 문의 작성</h3>
      <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
        <input
          className="border border-ui-border-base rounded-rounded p-3 text-base-regular"
          placeholder="이름 (선택)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="support-name"
        />
        <input
          className="border border-ui-border-base rounded-rounded p-3 text-base-regular"
          placeholder="답변 받을 이메일"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          data-testid="support-email"
        />
      </div>
      <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
        <select
          className="border border-ui-border-base rounded-rounded p-3 text-base-regular bg-transparent"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          data-testid="support-category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          className="border border-ui-border-base rounded-rounded p-3 text-base-regular"
          placeholder="제목 (선택)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          data-testid="support-subject"
        />
      </div>
      <textarea
        className="border border-ui-border-base rounded-rounded p-3 text-base-regular resize-none"
        rows={4}
        placeholder="문의 내용을 입력해 주세요. (5자 이상)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        data-testid="support-content"
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
          닫기
        </Button>
        <Button
          type="submit"
          className="rounded-none"
          isLoading={isPending}
          data-testid="submit-support"
        >
          접수
        </Button>
      </div>
    </form>
  )
}

export default SupportInquiryForm
