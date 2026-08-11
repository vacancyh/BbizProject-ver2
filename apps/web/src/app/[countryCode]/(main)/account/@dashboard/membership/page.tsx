import { getT } from "@lib/i18n"
import { Metadata } from "next"
import { notFound } from "next/navigation"

import MembershipTier from "@modules/account/components/membership-tier"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

// 정적 metadata 는 쿠키를 못 읽는다 → 언어별 제목을 내려면 generateMetadata 여야 한다.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("account.membership"), description: t("page.membershipMeta") }
}

export default async function MembershipPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const t = await getT()
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer || !region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="membership-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("account.membership")}</h1>
        <p className="text-base-regular">
          {t("page.membershipDesc")}
        </p>
      </div>
      <MembershipTier
        customerId={customer.id}
        currencyCode={region.currency_code}
      />
    </div>
  )
}
