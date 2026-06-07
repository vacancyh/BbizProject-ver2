/**
 * RBAC 기본 등급 · 메뉴 · 권한 매트릭스 시드 정의
 *
 * - MENU_IDS       = 권한 부여 대상 메뉴(navigation.ts NavItem.id + 기반 메뉴 3종)
 * - DEFAULT_ROLES  = 시스템 기본 등급 4종
 * - 권한 매트릭스  = 등급별 메뉴별 CRUD 기본값(buildDefaultPermissions 로 생성)
 *
 * 부트스트랩: super 는 전체 허용(checkPermission 에서 단락). 매트릭스에는 표시용으로 전체 true 시드.
 */
import { ROLE_KEYS, type RoleKey } from "../models/role"

// 권한 대상 메뉴 (apps/admin navigation.ts 와 정합 + 기반 메뉴 permissions/audit-logs/policies)
export const MENU_IDS = [
  "dashboard",
  "orders",
  "products",
  "categories",
  "members",
  "shipping",
  "settlement",
  "coupons",
  "marketing",
  "stats",
  "reviews",
  "settings",
  "permissions",
  "audit-logs",
  "policies",
] as const

export type MenuId = (typeof MENU_IDS)[number]

export const DEFAULT_ROLES: {
  key: RoleKey
  name: string
  description: string
  is_system: boolean
}[] = [
  { key: "super", name: "최고관리자", description: "전체 권한 · 권한/정책 관리 · 변경 불가", is_system: true },
  { key: "operation", name: "운영", description: "주문·상품·카테고리·회원·배송·리뷰 운영", is_system: true },
  { key: "cs", name: "고객지원", description: "주문/회원 조회·일부 수정 + 리뷰·문의 처리", is_system: true },
  { key: "marketer", name: "마케터", description: "쿠폰·프로모션·마케팅·통계", is_system: true },
]

type Perm = { can_read: boolean; can_create: boolean; can_update: boolean; can_delete: boolean }

const FULL: Perm = { can_read: true, can_create: true, can_update: true, can_delete: true }
const READ: Perm = { can_read: true, can_create: false, can_update: false, can_delete: false }
const EDIT: Perm = { can_read: true, can_create: false, can_update: true, can_delete: false } // 조회+수정(생성/삭제 불가)

// 등급별 CUD 허용 메뉴 정의 (그 외 메뉴는 READ)
const ROLE_FULL_MENUS: Record<Exclude<RoleKey, "super">, MenuId[]> = {
  operation: ["orders", "products", "categories", "members", "shipping", "reviews"],
  cs: ["reviews"],
  marketer: ["coupons", "marketing", "stats"],
}
const ROLE_EDIT_MENUS: Record<Exclude<RoleKey, "super">, MenuId[]> = {
  operation: [],
  cs: ["orders", "members"], // CS = 주문/회원 조회+수정(생성·삭제 불가)
  marketer: [],
}

/** 등급별 메뉴별 기본 권한 행 목록 생성 */
export function buildDefaultPermissions(): {
  role_key: RoleKey
  menu_id: MenuId
  can_read: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
}[] {
  const rows: ReturnType<typeof buildDefaultPermissions> = []
  for (const role of ROLE_KEYS) {
    for (const menu of MENU_IDS) {
      let perm: Perm
      if (role === "super") {
        perm = FULL // 표시용(실제 판정은 단락)
      } else {
        const full = ROLE_FULL_MENUS[role]
        const edit = ROLE_EDIT_MENUS[role]
        perm = full.includes(menu) ? FULL : edit.includes(menu) ? EDIT : READ
      }
      rows.push({ role_key: role, menu_id: menu, ...perm })
    }
  }
  return rows
}
