import { login } from "@lib/data/customer"
import SocialLogin from "@modules/account/components/social-login"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Login = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(login, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="login-page"
    >
      <h1 className="text-large-semi mb-6">다시 오신 것을 환영합니다</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        로그인하시면 더 편리한 쇼핑을 즐기실 수 있습니다.
      </p>
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="이메일"
            name="email"
            type="email"
            title="올바른 이메일 주소를 입력하세요."
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label="비밀번호"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage error={message} data-testid="login-error-message" />
        <div className="flex justify-end mt-2">
          <LocalizedClientLink
            href="/reset-password"
            className="text-small-regular text-ui-fg-muted hover:text-ui-fg-base underline"
            data-testid="forgot-password-link"
          >
            비밀번호를 잊으셨나요?
          </LocalizedClientLink>
        </div>
        <SubmitButton data-testid="sign-in-button" className="w-full mt-6">
          로그인
        </SubmitButton>
      </form>
      <SocialLogin />
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        아직 회원이 아니신가요?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="underline"
          data-testid="register-button"
        >
          회원가입
        </button>
      </span>
    </div>
  )
}

export default Login
