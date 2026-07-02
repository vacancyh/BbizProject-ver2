/**
 * 관리자 2FA(TOTP) 시크릿 — 관리자 user별 1건.
 * enabled=false: 등록 진행 중(시크릿만 발급). enabled=true: 활성(로그인 시 코드 요구).
 */
import { model } from "@medusajs/framework/utils"

const AdminTotp = model.define("admin_totp", {
  id: model.id({ prefix: "atotp" }).primaryKey(),
  // 관리자 user id (Medusa user.id)
  user_id: model.text().unique(),
  // TOTP 시크릿(base32)
  secret: model.text(),
  // 활성 여부
  enabled: model.boolean().default(false),
})

export default AdminTotp
