import { Metadata } from "next"
import { notFound } from "next/navigation"

import CouponList from "@modules/account/components/coupon-list"
import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "쿠폰함",
  description: "보유하신 쿠폰을 확인하세요.",
}

export default async function CouponsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="coupons-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">쿠폰함</h1>
        <p className="text-base-regular">
          보유하신 쿠폰을 확인하고 결제 시 사용하실 수 있습니다.
        </p>
      </div>
      <CouponList customerId={customer.id} currencyCode={region.currency_code} />
    </div>
  )
}
