import { useT } from "@lib/i18n/client"
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
  const t = useT()
  const [message, formAction] = useActionState(login, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="login-page"
    >
      <h1 className="text-large-semi mb-6">{t("account.welcomeBack")}</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        {t("account.loginHint")}
      </p>
      <form className="w-full" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t("account.email")}
            name="email"
            type="email"
            title={t("account.emailInvalid")}
            autoComplete="email"
            required
            data-testid="email-input"
          />
          <Input
            label={t("account.password")}
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
            {t("account.forgotPassword")}
          </LocalizedClientLink>
        </div>
        <SubmitButton data-testid="sign-in-button" className="w-full mt-6">
          {t("account.login")}
        </SubmitButton>
      </form>
      <SocialLogin />
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("account.noAccount")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
          className="underline"
          data-testid="register-button"
        >
          {t("account.register")}
        </button>
      </span>
    </div>
  )
}

export default Login
