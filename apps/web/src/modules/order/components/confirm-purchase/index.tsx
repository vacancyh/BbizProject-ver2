"use client"

import { useT } from "@lib/i18n/client"
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
  const t = useT()
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
          {t("confirm.done")}
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
        setError(res.error ?? t("confirm.failed"))
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
        {t("confirm.title")}
      </Button>
      <p className="text-small-regular text-ui-fg-muted">
        {t("confirm.body")}
      </p>
      {error && (
        <p className="text-small-regular text-ui-tag-red-text">{error}</p>
      )}
    </div>
  )
}

export default ConfirmPurchase
