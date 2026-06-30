"use client"

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
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const pts = Math.floor(Number(amount))
    if (!pts || pts <= 0) {
      setError("사용할 적립금을 입력해 주세요.")
      return
    }
    if (pts > balance) {
      setError(`보유 적립금(${balance.toLocaleString()}원)을 초과했습니다.`)
      return
    }
    startTransition(async () => {
      const res = await applyPoints(cartId, pts)
      if (res.ok) {
        setAmount("")
        router.refresh()
      } else {
        setError("적립금 사용에 실패했습니다. (보유/주문금액 확인)")
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
        <span className="txt-medium text-ui-fg-subtle">적립금 사용</span>
        <span className="txt-small text-ui-fg-muted">
          보유 {convertToLocale({ amount: balance, currency_code: currencyCode })}
        </span>
      </div>

      {applied > 0 ? (
        <div className="flex items-center justify-between">
          <span className="txt-medium text-ui-fg-interactive">
            {convertToLocale({ amount: applied, currency_code: currencyCode })} 사용 중
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="txt-small underline text-ui-fg-subtle"
            data-testid="remove-points"
          >
            사용 취소
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="flex gap-x-2">
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="사용할 금액"
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
            적용
          </Button>
        </form>
      )}
      {error && <p className="txt-small text-ui-tag-red-text">{error}</p>}
    </div>
  )
}

export default PointsForm
