"use client"

import { useActionState } from "react"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"
import PhoneVerify from "@modules/account/components/phone-verify"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup as (state: string | null, formData: FormData) => Promise<string | null>, null as string | null)

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi mb-6">회원가입</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        회원으로 가입하시고 더 편리한 쇼핑 혜택을 누려보세요.
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="이름"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label="성"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label="이메일"
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="휴대폰"
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label="비밀번호"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
          <div className="mt-2">
            <PhoneVerify />
          </div>
        </div>
        <ErrorMessage error={message} data-testid="register-error" />
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          가입 시{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline"
          >
            개인정보처리방침
          </LocalizedClientLink>{" "}
          및{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline"
          >
            이용약관
          </LocalizedClientLink>
          에 동의하게 됩니다.
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          가입하기
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        이미 회원이신가요?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          로그인
        </button>
      </span>
    </div>
  )
}

export default Register
