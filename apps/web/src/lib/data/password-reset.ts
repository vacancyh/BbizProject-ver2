"use server"

// 비밀번호 찾기/재설정 (Medusa 표준 auth 연동)
//  - 요청: POST /auth/customer/emailpass/reset-password { identifier } → 재설정 토큰 생성+이메일 발송
//  - 재설정: POST /auth/customer/emailpass/update (Bearer 토큰) { email, password }
// ※ 이메일 발송은 notification provider 필요(운영). dev 에선 토큰이 auth.password_reset 이벤트로 emit.

import { sdk } from "@lib/config"

export async function requestPasswordReset(
  email: string
): Promise<{ ok: boolean }> {
  try {
    await sdk.auth.resetPassword("customer", "emailpass", {
      identifier: email.trim(),
    })
  } catch {
    // 보안상 항상 동일 응답(계정 존재 여부 노출 방지)
  }
  return { ok: true }
}

export async function resetPassword(
  email: string,
  token: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await sdk.auth.updateProvider(
      "customer",
      "emailpass",
      { email: email.trim(), password },
      token
    )
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: "재설정에 실패했습니다. 링크가 만료되었거나 올바르지 않습니다.",
    }
  }
}
