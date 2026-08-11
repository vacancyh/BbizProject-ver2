"use client"

import { useT } from "@lib/i18n/client"
import { FREE_SHIPPING_THRESHOLD } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"

/**
 * 무료배송 임계 진행 안내 — 상품 소계 기준.
 * 임계 미만이면 "N원 더 담으면 무료배송", 이상이면 "무료배송 대상" + 진행바.
 */
const FreeShippingProgress = ({
  amountSubtotal,
  currencyCode,
}: {
  amountSubtotal: number
  currencyCode: string
}) => {
  const t = useT()
  const threshold = FREE_SHIPPING_THRESHOLD
  const remaining = Math.max(0, threshold - amountSubtotal)
  const qualified = remaining <= 0
  const pct = Math.min(100, Math.round((amountSubtotal / threshold) * 100))

  return (
    <div
      className="rounded-rounded border border-ui-border-base p-4"
      data-testid="free-shipping-progress"
    >
      <p className="text-small-regular text-ui-fg-base mb-2">
        {qualified ? (
          <span className="font-medium">{t("cart.freeShippingReached")}</span>
        ) : (
          <>
            <span className="font-medium text-ui-fg-base">
              {convertToLocale({ amount: remaining, currency_code: currencyCode })}
            </span>
            <span className="text-ui-fg-subtle">{t("cart.freeShippingRemain")}</span>
          </>
        )}
      </p>
      <div className="h-2 w-full rounded-full bg-ui-bg-subtle overflow-hidden">
        <div
          className="h-full bg-ui-fg-base transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default FreeShippingProgress
