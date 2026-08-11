import { getT } from "@lib/i18n"
import { Metadata } from "next"

import PasswordReset from "@modules/account/components/password-reset"

// 정적 metadata 는 쿠키를 못 읽는다 → 언어별 제목을 내려면 generateMetadata 여야 한다.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getT()
  return { title: t("page.resetPasswordSet"), description: t("page.resetPasswordMeta") }
}

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const t = await getT()
  const { token, email } = await props.searchParams

  return (
    <div className="content-container py-12 small:py-20 max-w-2xl">
      <h1 className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base mb-8">
        {token ? t("page.resetPasswordSet") : t("page.resetPasswordFind")}
      </h1>
      <PasswordReset token={token} emailParam={email} />
    </div>
  )
}
