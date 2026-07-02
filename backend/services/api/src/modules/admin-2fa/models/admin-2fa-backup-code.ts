/**
 * 2FA 백업(복구) 코드 — 인증기 분실 시 1회용 로그인 코드.
 *  - 활성화 시 N개 생성, 원문은 최초 1회만 노출. 저장은 sha256 해시.
 *  - used=true 로 소진(1회용). 남은 개수는 status 에 노출.
 */
import { model } from "@medusajs/framework/utils"

const Admin2faBackupCode = model.define("admin_2fa_backup_code", {
  id: model.id({ prefix: "a2bc" }).primaryKey(),
  // 관리자 user id (Medusa user.id)
  user_id: model.text().index("IDX_admin_2fa_backup_code_user_id"),
  // 코드 sha256 hex(원문 미저장)
  code_hash: model.text().index("IDX_admin_2fa_backup_code_hash"),
  // 소진 여부(1회용)
  used: model.boolean().default(false),
})

export default Admin2faBackupCode
