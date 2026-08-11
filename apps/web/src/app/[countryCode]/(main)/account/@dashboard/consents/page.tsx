import { getT } from "@lib/i18n"
import { Metadata } from "next"
import { notFound } from "next/navigation"

import ConsentManager from "@modules/account/components/consent-manager"
import { getConsents } from "@lib/data/consent"
import { retrieveCustomer } from "@lib/data/customer"

// 정적 metadata 는 쿠키를 못 읽는다 → 언어별 제목을 내려면 generateMetadata 여야 한다.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("account.navConsents"), description: t("page.consentsMeta") }
}

export default async function ConsentsPage() {
  const t = await getT()
  const customer = await retrieveCustomer()
  if (!customer) {
    notFound()
  }

  const consents = await getConsents()

  return (
    <div className="w-full" data-testid="consents-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">{t("account.navConsents")}</h1>
        <p className="text-base-regular">
          {t("page.consentsDesc")}
        </p>
      </div>
      <ConsentManager initial={consents} />
    </div>
  )
}
