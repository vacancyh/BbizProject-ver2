"use client"

import { Button } from "@modules/common/components/ui"
import { lookupGuestOrder } from "@lib/data/order-lookup"
import { useParams, useRouter } from "next/navigation"
import { useState, useTransition } from "react"

const OrderLookupForm = () => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const [displayId, setDisplayId] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!displayId.trim() || !email.trim()) {
      setError("주문번호와 이메일을 입력해 주세요.")
      return
    }
    startTransition(async () => {
      const res = await lookupGuestOrder(displayId.trim(), email.trim())
      if (res.ok) {
        router.push(`/${countryCode}/order/${res.orderId}/confirmed`)
      } else {
        setError(res.error)
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-y-4 max-w-md"
      data-testid="order-lookup-form"
    >
      <div className="flex flex-col gap-y-1">
        <label className="text-small-regular text-ui-fg-subtle">주문번호</label>
        <input
          type="text"
          value={displayId}
          onChange={(e) => setDisplayId(e.target.value)}
          placeholder="예: 45"
          className="border border-ui-border-base rounded-rounded bg-transparent p-3 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="lookup-display-id"
        />
      </div>
      <div className="flex flex-col gap-y-1">
        <label className="text-small-regular text-ui-fg-subtle">
          주문 시 입력한 이메일
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="border border-ui-border-base rounded-rounded bg-transparent p-3 text-base-regular outline-none focus:border-ui-fg-base"
          data-testid="lookup-email"
        />
      </div>
      {error && (
        <p className="text-small-regular text-ui-tag-red-text">{error}</p>
      )}
      <Button
        type="submit"
        className="rounded-none h-12 text-base"
        isLoading={isPending}
        data-testid="lookup-submit"
      >
        주문 조회
      </Button>
    </form>
  )
}

export default OrderLookupForm
