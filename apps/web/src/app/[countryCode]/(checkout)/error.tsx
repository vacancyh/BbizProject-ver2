"use client"

/**
 * 주문/결제 화면 오류 경계 (2026-08-12 신설)
 *
 * 결제 단계에서 오류가 나면 고객은 **돈이 빠져나갔는지** 부터 걱정한다.
 * 그래서 여기서는 "다시 시도" 말고 **장바구니로 돌아가기**를 앞에 둔다 —
 * 결제 요청을 무심코 다시 보내는 것보다 상태를 확인하는 편이 안전하다.
 *
 * 결제가 이미 됐을 가능성을 안내하고 고객센터로 가는 길을 함께 준다.
 */
import { useEffect } from "react"

import { useT } from "@lib/i18n/client"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { reportError } from "@lib/util/monitoring"

export default function CheckoutError({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useT()

  useEffect(() => {
    reportError(error, { digest: error.digest, scope: "checkout-segment" })
  }, [error])

  return (
    <div
      className="content-container flex flex-col items-center justify-center gap-6 py-32 text-center"
      data-testid="segment-error"
    >
      <h1 className="text-2xl-semi text-ui-fg-base">{t("error.globalTitle")}</h1>
      <p className="text-base-regular text-ui-fg-subtle max-w-md">
        {t("error.checkoutBody")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <LocalizedClientLink
          href="/cart"
          className="h-11 rounded-rounded border border-ui-border-interactive px-6 leading-[2.75rem] text-base-regular hover:bg-ui-bg-subtle"
        >
          {t("cart.title")}
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/account/orders"
          className="h-11 rounded-rounded border border-ui-border-base px-6 leading-[2.75rem] text-base-regular hover:bg-ui-bg-subtle"
        >
          {t("account.orders")}
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/customer-service"
          className="h-11 rounded-rounded px-6 leading-[2.75rem] text-base-regular text-ui-fg-interactive hover:underline"
        >
          {t("nav.customerService")}
        </LocalizedClientLink>
      </div>
    </div>
  )
}
