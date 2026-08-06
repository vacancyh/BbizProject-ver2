"use client"

import { useT } from "@lib/i18n/client"
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
  const t = useT()
  const [message, formAction] = useActionState(signup as (state: string | null, formData: FormData) => Promise<string | null>, null as string | null)

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi mb-6">{t("account.register")}</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        {t("account.registerHint")}
      </p>
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label={t("account.firstName")}
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label={t("account.lastName")}
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label={t("account.email")}
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label={t("account.phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label={t("account.password")}
            name="password"
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
            title={t("account.passwordRule")}
            data-testid="password-input"
          />
          <p className="text-xsmall-regular text-ui-fg-muted -mt-2">
            {t("account.passwordRuleHint")}
          </p>
          <div className="mt-2">
            <PhoneVerify />
          </div>
        </div>
        <ErrorMessage error={message} data-testid="register-error" />
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          {t("account.agreePrefix")}{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline"
          >
            {t("account.privacyPolicy")}
          </LocalizedClientLink>{" "}
          {t("account.agreeMiddle")}{" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline"
          >
            {t("account.termsOfUse")}
          </LocalizedClientLink>
          {t("account.agreeSuffix")}
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          {t("account.submitRegister")}
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        {t("account.hasAccount")}{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          {t("account.login")}
        </button>
      </span>
    </div>
  )
}

export default Register
