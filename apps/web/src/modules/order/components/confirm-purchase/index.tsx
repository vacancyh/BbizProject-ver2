"use client"

import { Button } from "@modules/common/components/ui"
import { confirmPurchase } from "@lib/data/order-requests"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

// 구매확정은 배송중/배송완료 주문에만 노출
const ELIGIBLE = ["shipped", "partially_shipped", "delivered", "partially_delivered"]

const ConfirmPurchase = ({
  orderId,
  fulfillmentStatus,
}: {
  orderId: string
  fulfillmentStatus?: string
}) => {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!fulfillmentStatus || !ELIGIBLE.includes(fulfillmentStatus)) {
    return null
  }

  if (done) {
    return (
      <div className="mt-6 rounded-rounded border border-ui-border-base bg-ui-bg-subtle p-4 text-center">
        <p className="text-base-regular text-ui-fg-base">
          구매가 확정되었습니다. 이용해 주셔서 감사합니다!
        </p>
      </div>
    )
  }

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const res = await confirmPurchase(orderId)
      if (res.ok) {
        setDone(true)
        router.refresh()
      } else {
        setError(res.error ?? "처리 실패")
      }
    })
  }

  return (
    <div className="mt-6 flex flex-col gap-y-2">
      <Button
        className="rounded-none w-fit"
        onClick={handleConfirm}
        isLoading={isPending}
        data-testid="confirm-purchase"
      >
        구매확정
      </Button>
      <p className="text-small-regular text-ui-fg-muted">
        상품을 정상적으로 받으셨다면 구매확정해 주세요. 확정 시 교환·반품
        기간이 종료됩니다.
      </p>
      {error && (
        <p className="text-small-regular text-ui-tag-red-text">{error}</p>
      )}
    </div>
  )
}

export default ConfirmPurchase
