import { CreditCard } from "@medusajs/icons"
import Bancontact from "@modules/common/icons/bancontact"
import Ideal from "@modules/common/icons/ideal"
import PayPal from "@modules/common/icons/paypal"
import React from "react"
import type { MessageKey } from "@lib/i18n/messages"

/** 무료배송 기준 금액(원). 상품 소계가 이 금액 이상이면 무료배송 안내. */
export const FREE_SHIPPING_THRESHOLD = 50000

/*
 * Map of payment provider_id to their title and icon.
 *
 * `title` 은 브랜드명(PayPal·Bancontact 등)이라 번역하지 않는다.
 * 브랜드가 아닌 일반 명칭(무통장입금 등)만 `titleKey` 로 언어를 따라가게 한다.
 */
export const paymentInfoMap: Record<
  string,
  { title: string; titleKey?: MessageKey; icon: React.JSX.Element }
> = {
  pp_stripe_stripe: {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_medusa-payments_default": {
    title: "Credit card",
    icon: <CreditCard />,
  },
  "pp_stripe-ideal_stripe": {
    title: "iDeal",
    icon: <Ideal />,
  },
  "pp_stripe-bancontact_stripe": {
    title: "Bancontact",
    icon: <Bancontact />,
  },
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  pp_system_default: {
    title: "무통장입금",
    titleKey: "payment.bankTransfer",
    icon: <CreditCard />,
  },
  // Add more payment providers here
}

// This only checks if it is native stripe or medusa payments for card payments, it ignores the other stripe-based providers
export const isStripeLike = (providerId?: string) => {
  return (
    providerId?.startsWith("pp_stripe_") || providerId?.startsWith("pp_medusa-")
  )
}

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal")
}
export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default")
}

// Add currencies that don't need to be divided by 100
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
]

/**
 * 결제수단 표시명.
 *
 * 브랜드명(PayPal 등)은 그대로 두고, 일반 명칭만 언어에 맞게 바꾼다.
 * 등록되지 않은 provider 는 빈 문자열 — 호출부에서 provider_id 를 대신 보여 준다.
 */
export function payTitle(
  t: (k: MessageKey) => string,
  providerId?: string | null
): string {
  if (!providerId) return ""
  const info = paymentInfoMap[providerId]
  if (!info) return ""
  return info.titleKey ? t(info.titleKey) : info.title
}
