import { Metadata } from "next"

import PasswordReset from "@modules/account/components/password-reset"

export const metadata: Metadata = {
  title: "비밀번호 재설정",
  description: "비밀번호를 재설정합니다.",
}

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token, email } = await props.searchParams

  return (
    <div className="content-container py-12 small:py-20 max-w-2xl">
      <h1 className="text-2xl small:text-3xl font-semibold tracking-tight text-ui-fg-base mb-8">
        비밀번호 {token ? "재설정" : "찾기"}
      </h1>
      <PasswordReset token={token} emailParam={email} />
    </div>
  )
}
