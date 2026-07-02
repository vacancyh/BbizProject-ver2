/**
 * 2FA 검증 세션 — 특정 로그인 토큰이 2단계 인증까지 통과했음을 서버측에 기록.
 *
 * 목적: 클라이언트 우회 방지. `/admin/*` 미들웨어가 2FA 활성 사용자의
 *       "검증되지 않은 토큰" 접근을 차단(2FA_REQUIRED)한다.
 *  - token_hash: 로그인 Bearer 토큰의 sha256(원문 미저장)
 *  - expires_at: 재검증 요구 시점(만료 후 다시 OTP 필요)
 */
import { model } from "@medusajs/framework/utils"

const AdminTotpSession = model.define("admin_totp_session", {
  id: model.id({ prefix: "a2fs" }).primaryKey(),
  // 관리자 user id (Medusa user.id)
  user_id: model.text().index("IDX_admin_totp_session_user_id"),
  // 로그인 토큰 sha256 hex (원문 저장하지 않음)
  token_hash: model.text().index("IDX_admin_totp_session_token_hash"),
  // 만료 시각(이후 재검증 필요)
  expires_at: model.dateTime(),
})

export default AdminTotpSession
