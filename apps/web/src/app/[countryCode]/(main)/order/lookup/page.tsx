import { Metadata } from "next"

import OrderLookupForm from "@modules/order/components/order-lookup-form"

export const metadata: Metadata = {
  title: "비회원 주문조회",
  description: "주문번호와 이메일로 주문을 조회하세요.",
}

export default function OrderLookupPage() {
  return (
    <div className="content-container py-12 small:py-20 max-w-2xl">
      <h1 className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base mb-2">
        비회원 주문조회
      </h1>
      <p className="text-base-regular text-ui-fg-subtle mb-10">
        주문 시 입력하신 주문번호와 이메일로 주문 내역을 확인하실 수 있습니다.
      </p>
      <OrderLookupForm />
    </div>
  )
}
