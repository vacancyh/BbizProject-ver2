"use client"

import React from "react"
import Input from "@modules/common/components/input"
import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { changePassword } from "@lib/data/password-reset"
import { useToast } from "@modules/common/components/toast"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

/**
 * 비밀번호 변경 (2026-07-29 구현)
 *
 * 이전에는 제출해도 `console.info("Password update is not implemented")` 만 찍히고
 * **아무 일도 일어나지 않았다**(성공/실패 표시조차 없음). 실제 동작하도록 연결한다.
 *  - 현재 비밀번호로 재인증해 본인 확인 후 변경(서버 액션)
 *  - 결과는 인라인 상태 + 토스트로 함께 알린다
 */
const ProfilePassword: React.FC<MyInformationProps> = ({ customer }) => {
  const [successState, setSuccessState] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>()
  const { showToast } = useToast()

  const updatePassword = async (formData: FormData) => {
    setErrorMessage(undefined)
    setSuccessState(false)

    const current = String(formData.get("old_password") ?? "")
    const next = String(formData.get("new_password") ?? "")
    const confirm = String(formData.get("confirm_password") ?? "")

    if (next !== confirm) {
      const msg = "새 비밀번호가 서로 일치하지 않습니다."
      setErrorMessage(msg)
      showToast(msg, "error")
      return
    }

    const email = customer?.email
    if (!email) {
      const msg = "로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요."
      setErrorMessage(msg)
      showToast(msg, "error")
      return
    }

    const res = await changePassword(email, current, next)
    if (res.ok) {
      setSuccessState(true)
      showToast("비밀번호가 변경되었습니다.", "success")
    } else {
      setErrorMessage(res.error)
      showToast(res.error ?? "비밀번호 변경에 실패했습니다.", "error")
    }
  }

  const clearState = () => {
    setSuccessState(false)
    setErrorMessage(undefined)
  }

  return (
    <form action={updatePassword} onReset={() => clearState()} className="w-full">
      <AccountInfo
        label="비밀번호"
        currentInfo={<span>보안을 위해 비밀번호는 표시되지 않습니다</span>}
        isSuccess={successState}
        isError={!!errorMessage}
        errorMessage={errorMessage}
        clearState={clearState}
        data-testid="account-password-editor"
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="현재 비밀번호"
            name="old_password"
            required
            type="password"
            data-testid="old-password-input"
          />
          <Input
            label="새 비밀번호 (8자 이상)"
            type="password"
            name="new_password"
            required
            minLength={8}
            data-testid="new-password-input"
          />
          <Input
            label="비밀번호 확인"
            type="password"
            name="confirm_password"
            required
            minLength={8}
            data-testid="confirm-password-input"
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfilePassword
