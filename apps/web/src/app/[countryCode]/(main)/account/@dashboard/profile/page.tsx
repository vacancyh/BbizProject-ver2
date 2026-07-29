import { Metadata } from "next"

import ProfilePhone from "@modules/account//components/profile-phone"
import ProfileBillingAddress from "@modules/account/components/profile-billing-address"
import ProfileEmail from "@modules/account/components/profile-email"
import ProfileName from "@modules/account/components/profile-name"
import ProfilePassword from "@modules/account/components/profile-password"
import WithdrawAccount from "@modules/account/components/withdraw-account"
import { notFound } from "next/navigation"
import { listRegions } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "프로필",
  description: "내 프로필 정보를 확인하고 수정합니다.",
}

export default async function Profile() {
  const customer = await retrieveCustomer()
  const regions = await listRegions()

  if (!customer || !regions) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="profile-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">프로필</h1>
        <p className="text-base-regular">
          이름·이메일·휴대폰 등 프로필 정보를 확인하고 수정하실 수 있습니다.
          청구지 정보도 함께 관리하실 수 있습니다.
        </p>
      </div>
      <div className="flex flex-col gap-y-8 w-full">
        <ProfileName customer={customer} />
        <Divider />
        <ProfileEmail customer={customer} />
        <Divider />
        <ProfilePhone customer={customer} />
        <Divider />
        {/* 비밀번호 변경 — 구현 전이라 주석 처리돼 있었다(2026-07-29 구현·복원) */}
        <ProfilePassword customer={customer} />
        <Divider />
        <ProfileBillingAddress customer={customer} regions={regions} />
      </div>
      <WithdrawAccount />
    </div>
  )
}

const Divider = () => {
  return <div className="w-full h-px bg-gray-200" />
}
