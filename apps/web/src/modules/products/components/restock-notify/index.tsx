"use client"

import { Button } from "@modules/common/components/ui"
import { subscribeRestock } from "@lib/data/restock"
import { useState, useTransition } from "react"

const RestockNotify = ({
  variantId,
  productId,
}: {
  variantId: string
  productId: string
}) => {
  const [email, setEmail] = useState("")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (done) {
    return (
      <p
        className="text-small-regular text-ui-fg-base mt-2"
        data-testid="restock-done"
      >
        재입고 시 입력하신 이메일로 알려드리겠습니다.
      </p>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("올바른 이메일 주소를 입력해 주세요.")
      return
    }
    startTransition(async () => {
      const res = await subscribeRestock(variantId, productId, email.trim())
      if (res.ok) {
        setDone(true)
      } else {
        setError(res.error ?? "신청 실패")
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-col gap-y-2"
      data-testid="restock-form"
    >
      <p className="text-small-regular text-ui-fg-subtle">
        품절된 상품입니다. 재입고 알림을 신청하세요.
      </p>
      <div className="flex gap-x-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소"
          className="flex-1 border border-ui-border-base rounded-none bg-transparent px-3 h-12 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="restock-email"
        />
        <Button
          type="submit"
          variant="secondary"
          className="rounded-none h-12 whitespace-nowrap"
          isLoading={isPending}
          data-testid="restock-submit"
        >
          알림 신청
        </Button>
      </div>
      {error && (
        <p className="text-small-regular text-ui-tag-red-text">{error}</p>
      )}
    </form>
  )
}

export default RestockNotify
