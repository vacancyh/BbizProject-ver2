/**
 * RBAC 모듈 서비스 — 관리자 권한(등급·메뉴별 CRUD).
 *
 * 주요 메서드:
 *  - seedDefaults()                         = 기본 등급 4종 + 권한 매트릭스 시드(idempotent)
 *  - getMatrix()                            = 등급 + 권한 매트릭스 + 메뉴 목록 반환(권한 관리 화면)
 *  - setRolePermission(role, menu, perms)   = 등급별 메뉴 권한 수정(super 변경 금지)
 *  - assignRole(userId, roleKey)            = 관리자에게 등급 부여(1인 1등급 upsert)
 *  - getUserRole(userId)                    = 관리자의 등급 키 조회(미지정 = null)
 *  - checkPermission(userId, menu, action)  = 미들웨어 권한 판정(미지정/super = 허용)
 *
 * 가드레일: Medusa core(user) 미수정. user_id 는 text 보관.
 */
import { MedusaService } from "@medusajs/framework/utils"
import Role, { ROLE_KEYS, type RoleKey } from "./models/role"
import RolePermission from "./models/role-permission"
import UserRole from "./models/user-role"
import { DEFAULT_ROLES, MENU_IDS, buildDefaultPermissions } from "./seed/defaults"
import {
  isValidRole,
  evaluatePermission,
  assertRoleAssignable,
  type PermRow,
} from "./logic"

export type RbacAction = "read" | "create" | "update" | "delete"

class RbacModuleService extends MedusaService({
  Role,
  RolePermission,
  UserRole,
}) {
  /**
   * 기본 등급 + 권한 매트릭스 시드. 이미 존재하면 건너뜀(idempotent).
   * @returns 시드 후 등급/권한 행 수
   */
  async seedDefaults(): Promise<{ roles: number; permissions: number }> {
    for (const r of DEFAULT_ROLES) {
      const ex = await this.listRoles({ key: r.key })
      if (!ex.length) {
        await this.createRoles([r])
      }
    }
    for (const p of buildDefaultPermissions()) {
      const ex = await this.listRolePermissions({
        role_key: p.role_key,
        menu_id: p.menu_id,
      })
      if (!ex.length) {
        await this.createRolePermissions([p])
      }
    }
    const roles = await this.listRoles({})
    const perms = await this.listRolePermissions({})
    return { roles: roles.length, permissions: perms.length }
  }

  /**
   * 권한 매트릭스 조회(권한 관리 화면).
   * @returns 등급 목록 + 권한 행 + 메뉴 식별자
   */
  async getMatrix(): Promise<{
    roles: any[]
    permissions: any[]
    menus: readonly string[]
  }> {
    const roles = await this.listRoles({}, { order: { key: "ASC" } })
    const permissions = await this.listRolePermissions({})
    return { roles, permissions, menus: MENU_IDS }
  }

  /**
   * 등급별 메뉴 권한 수정(upsert). super 등급은 변경 금지.
   */
  async setRolePermission(
    roleKey: string,
    menuId: string,
    perms: Partial<{
      can_read: boolean
      can_create: boolean
      can_update: boolean
      can_delete: boolean
    }>
  ): Promise<any> {
    if (roleKey === "super") {
      throw new Error("[rbac] 최고관리자(super) 권한은 변경할 수 없습니다.")
    }
    if (!isValidRole(roleKey)) {
      throw new Error(`[rbac] 유효하지 않은 등급입니다: ${roleKey}`)
    }
    const ex = await this.listRolePermissions({
      role_key: roleKey,
      menu_id: menuId,
    })
    if (ex.length) {
      const [updated] = await this.updateRolePermissions([
        { id: ex[0].id, ...perms },
      ])
      return updated
    }
    const [created] = await this.createRolePermissions([
      {
        role_key: roleKey,
        menu_id: menuId,
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
        ...perms,
      },
    ])
    return created
  }

  /**
   * 관리자에게 등급 부여(1인 1등급 upsert).
   *
   * C3 가드레일: 대상 관리자의 현재 등급이 super이고 roleKey가 super가 아닌 경우,
   * super 등급을 가진 관리자가 1명뿐이면 변경을 차단(최소 1명 보장).
   */
  async assignRole(userId: string, roleKey: string): Promise<any> {
    // logic.ts: 등급 키 유효성 검사
    if (!isValidRole(roleKey)) {
      throw new Error(`[rbac] 유효하지 않은 등급입니다: ${roleKey}`)
    }

    // C3: SUPER 0명화 차단 — logic.ts assertRoleAssignable 위임
    const current = await this.listUserRoles({ user_id: userId })
    const currentRoleKey = current.length ? current[0].role_key : null
    if (currentRoleKey === "super" && roleKey !== "super") {
      const superUsers = await this.listUserRoles({ role_key: "super" })
      assertRoleAssignable(roleKey, currentRoleKey, superUsers.length)
    }

    const ex = await this.listUserRoles({ user_id: userId })
    if (ex.length) {
      const [updated] = await this.updateUserRoles([
        { id: ex[0].id, role_key: roleKey },
      ])
      return updated
    }
    const [created] = await this.createUserRoles([
      { user_id: userId, role_key: roleKey },
    ])
    return created
  }

  /**
   * 관리자의 등급 키 조회. 미지정이면 null.
   */
  async getUserRole(userId: string): Promise<RoleKey | null> {
    if (!userId) return null
    const ex = await this.listUserRoles({ user_id: userId })
    return ex.length ? (ex[0].role_key as RoleKey) : null
  }

  /**
   * 미들웨어 권한 판정.
   *
   * 부트스트랩 정책(마이그레이션 잠금 방지):
   *  - 등급 미지정 관리자 = 전체 허용(true)
   *  - super 등급 = 전체 허용(true)
   *  - 그 외 = 해당 메뉴 권한 행의 can_<action> 값(행 없으면 false)
   */
  async checkPermission(
    userId: string,
    menuId: string,
    action: RbacAction
  ): Promise<boolean> {
    const roleKey = await this.getUserRole(userId)
    // logic.ts evaluatePermission 위임: 미할당/super 단락 + 권한 행 조회
    if (!roleKey || roleKey === "super") {
      return evaluatePermission(roleKey, menuId, action, [])
    }
    const rp = await this.listRolePermissions({
      role_key: roleKey,
      menu_id: menuId,
    })
    return evaluatePermission(roleKey, menuId, action, rp as PermRow[])
  }
}

export default RbacModuleService
