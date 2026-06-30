import { Metadata } from "next"
import { notFound } from "next/navigation"

import ConsentManager from "@modules/account/components/consent-manager"
import { getConsents } from "@lib/data/consent"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "동의 관리",
  description: "마케팅 수신 동의를 관리합니다.",
}

export default async function ConsentsPage() {
  const customer = await retrieveCustomer()
  if (!customer) {
    notFound()
  }

  const consents = await getConsents()

  return (
    <div className="w-full" data-testid="consents-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">동의 관리</h1>
        <p className="text-base-regular">
          마케팅 정보 수신 동의를 변경하실 수 있습니다. 필수 약관 동의는 회원가입
          시 처리됩니다.
        </p>
      </div>
      <ConsentManager initial={consents} />
    </div>
  )
}
