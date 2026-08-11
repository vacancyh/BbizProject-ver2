"use client"

import { useT } from "@lib/i18n/client"
import React from "react"

import Input from "@modules/common/components/input"

import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { changeEmail } from "@lib/data/customer"
import { useToast } from "@modules/common/components/toast"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

/**
 * 이메일(로그인 아이디) 변경 (2026-07-29 구현)
 *
 * 이전에는 폼을 제출하면 **아무 것도 하지 않고 성공 메시지만** 표시했다
 * ("TODO: It seems we don't support updating emails now?"). 사용자는 바뀐 줄 알지만 그대로였다.
 * 이제 백엔드 전용 라우트로 고객 레코드와 로그인 자격을 함께 갱신한다.
 * 이메일은 곧 로그인 아이디이므로 **현재 비밀번호로 본인 확인**을 받는다.
 */
const ProfileEmail: React.FC<MyInformationProps> = ({ customer }) => {
  const t = useT()
  const [successState, setSuccessState] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>()
  const { showToast } = useToast()

  const submit = async (formData: FormData) => {
    setErrorMessage(undefined)
    setSuccessState(false)

    const newEmail = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("current_password") ?? "")

    if (!newEmail || newEmail.toLowerCase() === (customer.email ?? "").toLowerCase()) {
      const msg = t("profile.emailSame")
      setErrorMessage(msg)
      showToast(msg, "error")
      return
    }

    const res = await changeEmail(newEmail, password)
    if (res.ok) {
      setSuccessState(true)
      showToast(t("profile.emailChanged"), "success")
    } else {
      setErrorMessage(res.error)
      showToast(res.error ?? t("profile.emailFailed"), "error")
    }
  }

  const clearState = () => {
    setSuccessState(false)
    setErrorMessage(undefined)
  }

  return (
    <form action={submit} className="w-full">
      <AccountInfo
        label={t("account.email")}
        currentInfo={`${customer.email}`}
        isSuccess={successState}
        isError={!!errorMessage}
        errorMessage={errorMessage}
        clearState={clearState}
        data-testid="account-email-editor"
      >
        <div className="grid grid-cols-1 gap-y-2">
          <Input
            label={t("profile.newEmail")}
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={customer.email}
            data-testid="email-input"
          />
          <Input
            label={t("profile.currentPasswordForCheck")}
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="email-current-password-input"
          />
          <p className="text-ui-fg-subtle txt-compact-small">
            {t("profile.emailNote")}
          </p>
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfileEmail
