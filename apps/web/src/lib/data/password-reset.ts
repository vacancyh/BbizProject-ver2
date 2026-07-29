"use server"

// 비밀번호 찾기/재설정 (Medusa 표준 auth 연동)
//  - 요청: POST /auth/customer/emailpass/reset-password { identifier } → 재설정 토큰 생성+이메일 발송
//  - 재설정: POST /auth/customer/emailpass/update (Bearer 토큰) { email, password }
// ※ 이메일 발송은 notification provider 필요(운영). dev 에선 토큰이 auth.password_reset 이벤트로 emit.

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

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

/**
 * 로그인 상태에서 비밀번호 변경 (2026-07-29)
 *
 * 코어의 `/auth/customer/emailpass/update` 는 **재설정 토큰**을 요구해(알림 provider 필요)
 * 로그인 사용자가 쓸 수 없었다. 백엔드에 세션 인증 기반 전용 라우트를 만들어 그쪽을 호출한다.
 * 현재 비밀번호 재확인은 서버에서 수행한다.
 */
export async function changePassword(
  _email: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: "새 비밀번호는 8자 이상이어야 합니다." }
  }
  if (currentPassword === newPassword) {
    return { ok: false, error: "현재 비밀번호와 다른 비밀번호를 사용해 주세요." }
  }

  try {
    await sdk.client.fetch("/store/customers/me/password", {
      method: "POST",
      body: { current_password: currentPassword, new_password: newPassword },
      headers: { ...(await getAuthHeaders()) },
    })
    return { ok: true }
  } catch (e: unknown) {
    const message =
      (e as { message?: string })?.message ??
      "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요."
    return { ok: false, error: message }
  }
}
