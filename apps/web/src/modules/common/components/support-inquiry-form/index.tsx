"use client"

import { useState, useTransition } from "react"
import { useT } from "@lib/i18n/client"
import type { MessageKey } from "@lib/i18n/messages"
import { Button } from "@modules/common/components/ui"
import { submitSupportInquiry } from "@lib/data/support"

/** 문의 분류 — 값은 번역 키다. 백엔드에는 **한국어 원문**을 보낸다(관리자 화면 기준). */
const CATEGORIES: { key: MessageKey; value: string }[] = [
  { key: "cs.category.order", value: "주문/결제" },
  { key: "cs.category.shipping", value: "배송" },
  { key: "cs.category.return", value: "교환/반품" },
  { key: "cs.category.member", value: "회원/적립금" },
  { key: "cs.category.etc", value: "기타" },
]

/** 1:1 문의(상품무관) 작성 폼 — 고객센터 페이지. */
const SupportInquiryForm = () => {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [category, setCategory] = useState(CATEGORIES[0].value)
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (content.trim().length < 5) {
      setError(t("cs.formTooShort"))
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
      else setError(res.error ?? t("cs.formFailed"))
    })
  }

  if (done) {
    return (
      <div
        className="rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-6 text-center"
        data-testid="support-done"
      >
        <p className="text-base-regular text-ui-fg-base">
          {t("cs.formDone")}
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
        {t("cs.openInquiryForm")}
      </Button>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-rounded border border-ui-border-base p-6 flex flex-col gap-y-4"
      data-testid="support-form"
    >
      <h3 className="text-large-semi">{t("cs.formTitle")}</h3>
      <div className="grid grid-cols-1 small:grid-cols-2 gap-3">
        <input
          className="border border-ui-border-base rounded-rounded p-3 text-base-regular"
          placeholder={t("cs.formName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="support-name"
        />
        <input
          className="border border-ui-border-base rounded-rounded p-3 text-base-regular"
          placeholder={t("cs.formEmail")}
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
            <option key={c.value} value={c.value}>
              {t(c.key)}
            </option>
          ))}
        </select>
        <input
          className="border border-ui-border-base rounded-rounded p-3 text-base-regular"
          placeholder={t("cs.formSubject")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          data-testid="support-subject"
        />
      </div>
      <textarea
        className="border border-ui-border-base rounded-rounded p-3 text-base-regular resize-none"
        rows={4}
        placeholder={t("cs.formBody")}
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
          {t("common.close")}
        </Button>
        <Button
          type="submit"
          className="rounded-none"
          isLoading={isPending}
          data-testid="submit-support"
        >
          {t("cs.formSubmit")}
        </Button>
      </div>
    </form>
  )
}

export default SupportInquiryForm
