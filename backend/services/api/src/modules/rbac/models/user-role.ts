/**
 * RBAC 관리자-등급 매핑(UserRole) 모델
 *
 * Medusa core user 를 수정하지 않고 user_id(text) ↔ role_key 매핑을 별도 보관한다.
 *  - 한 관리자 = 한 등급(user_id unique)
 *  - 미지정(매핑 없음) 관리자는 부트스트랩 정책상 SUPER 로 간주(checkPermission 참조) → 마이그레이션 중 잠금 방지
 */
import { model } from "@medusajs/framework/utils"

const UserRole = model.define("rbac_user_role", {
  // 매핑 고유 id (prefix = urole)
  id: model.id({ prefix: "urole" }).primaryKey(),
  // Medusa user.id (core 미수정, text 보관)
  user_id: model.text().unique(),
  // 등급 키 (rbac_role.key)
  role_key: model.text(),
})

export default UserRole
