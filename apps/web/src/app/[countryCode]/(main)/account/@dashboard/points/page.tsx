import { Metadata } from "next"
import { notFound } from "next/navigation"

import PointHistory from "@modules/account/components/point-history"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "적립금",
  description: "보유 적립금과 적립/사용 내역을 확인하세요.",
}

export default async function PointsPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="points-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">적립금</h1>
        <p className="text-base-regular">
          보유하신 적립금과 적립·사용 내역을 확인하실 수 있습니다.
        </p>
      </div>
      <PointHistory
        customerId={customer.id}
        currencyCode={region.currency_code}
      />
    </div>
  )
}
