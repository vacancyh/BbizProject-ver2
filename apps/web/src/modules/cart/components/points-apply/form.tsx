"use client"

import { useT } from "@lib/i18n/client"
import { Button } from "@modules/common/components/ui"
import { applyPoints, removePoints } from "@lib/data/points-checkout"
import { convertToLocale } from "@lib/util/money"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

const PointsForm = ({
  cartId,
  balance,
  applied,
  currencyCode,
}: {
  cartId: string
  balance: number
  applied: number
  currencyCode: string
}) => {
  const t = useT()
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const pts = Math.floor(Number(amount))
    if (!pts || pts <= 0) {
      setError(t("cart.pointsEmpty"))
      return
    }
    if (pts > balance) {
      setError(t("cart.pointsOver", { amount: balance.toLocaleString() }))
      return
    }
    startTransition(async () => {
      const res = await applyPoints(cartId, pts)
      if (res.ok) {
        setAmount("")
        router.refresh()
      } else {
        setError(t("cart.pointsFailed"))
      }
    })
  }

  const handleRemove = () => {
    startTransition(async () => {
      await removePoints(cartId)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-y-2" data-testid="points-apply">
      <div className="flex items-center justify-between">
        <span className="txt-medium text-ui-fg-subtle">{t("checkout.usePoints")}</span>
        <span className="txt-small text-ui-fg-muted">
          {t("cart.pointsBalance", {
            amount: convertToLocale({ amount: balance, currency_code: currencyCode }),
          })}
        </span>
      </div>

      {applied > 0 ? (
        <div className="flex items-center justify-between">
          <span className="txt-medium text-ui-fg-interactive">
            {t("cart.pointsApplied", {
              amount: convertToLocale({ amount: applied, currency_code: currencyCode }),
            })}
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="txt-small underline text-ui-fg-subtle"
            data-testid="remove-points"
          >
            {t("cart.pointsCancel")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="flex gap-x-2">
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t("cart.pointsPlaceholder")}
            className="flex-1 border border-ui-border-base rounded-none bg-transparent px-3 h-10 text-base-regular outline-none focus:border-ui-fg-base"
            data-testid="points-input"
          />
          <Button
            type="submit"
            variant="secondary"
            className="rounded-none h-10 whitespace-nowrap"
            isLoading={isPending}
            disabled={balance <= 0}
            data-testid="apply-points"
          >
            {t("cart.pointsApply")}
          </Button>
        </form>
      )}
      {error && <p className="txt-small text-ui-tag-red-text">{error}</p>}
    </div>
  )
}

export default PointsForm
