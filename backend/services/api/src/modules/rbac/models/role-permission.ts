/**
 * RBAC 등급별 메뉴 권한(RolePermission) 모델
 *
 * 메뉴별 · 기능별 CRUD 2계층 권한(관리자_설계.md §5.1).
 *  - menu_id = apps/admin/src/lib/nav/navigation.ts 의 NavItem.id 와 1:1 (+ 기반 메뉴)
 *  - can_read/create/update/delete = 해당 메뉴에서 허용되는 CRUD
 *
 * (role_key, menu_id) 조합 유일성은 service 의 upsert 로직으로 보장한다.
 */
import { model } from "@medusajs/framework/utils"

const RolePermission = model.define("rbac_role_permission", {
  // 권한 행 고유 id (prefix = rperm)
  id: model.id({ prefix: "rperm" }).primaryKey(),
  // 등급 키 (rbac_role.key 참조)
  role_key: model.text().index("IDX_rbac_role_permission_role_key"),
  // 메뉴 식별자 (navigation.ts NavItem.id)
  menu_id: model.text(),
  // 조회 권한
  can_read: model.boolean().default(true),
  // 생성 권한
  can_create: model.boolean().default(false),
  // 수정 권한
  can_update: model.boolean().default(false),
  // 삭제 권한
  can_delete: model.boolean().default(false),
})

export default RolePermission
