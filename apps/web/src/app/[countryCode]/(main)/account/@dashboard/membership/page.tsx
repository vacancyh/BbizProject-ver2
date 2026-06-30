import { Metadata } from "next"
import { notFound } from "next/navigation"

import MembershipTier from "@modules/account/components/membership-tier"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "등급",
  description: "내 회원 등급과 혜택, 다음 등급 조건을 확인하세요.",
}

export default async function MembershipPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="membership-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">등급</h1>
        <p className="text-base-regular">
          회원님의 등급과 혜택, 다음 등급까지 남은 조건을 확인하실 수 있습니다.
        </p>
      </div>
      <MembershipTier
        customerId={customer.id}
        currencyCode={region.currency_code}
      />
    </div>
  )
}
