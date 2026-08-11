import { Metadata } from "next"
import { getT } from "@lib/i18n"

import LoginTemplate from "@modules/account/templates/login-template"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("account.login"), description: t("account.loginHint") }
}

export default function Login() {
  return <LoginTemplate />
}
