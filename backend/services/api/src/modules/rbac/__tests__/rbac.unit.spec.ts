/**
 * RBAC 권한 단위 테스트 — t010 §9 (재작성 — production logic.ts 직접 검증)
 *
 * UT-001: 역할별 메뉴·CRUD 게이트(허용/차단)
 *   - 미할당(null) = 전체 허용(C1 부트스트랩 정책)
 *   - super = 전체 허용
 *   - cs/operation/marketer = 메뉴별 CRUD 비트 게이트 검증
 *   - C2: 매핑 없는 메뉴 = 비SUPER 차단
 *
 * UT-002: 역할 부여 즉시 반영 + C3 가드레일
 *   - assertRoleAssignable: 마지막 super 0명화 차단
 *   - 역할 변경 후 evaluatePermission 즉시 반영
 *
 * 테스트 전략:
 *  - production logic.ts (evaluatePermission, assertRoleAssignable, isValidRole) 직접 import
 *  - seed/defaults.ts buildDefaultPermissions 직접 import (실제 권한 매트릭스 사용)
 *  - TestRbacService 복제본 없음 — 모든 검증이 production 함수를 호출
 *  - DB·MedusaService 의존 없음 (logic.ts 가 순수 함수이므로 mock 불필요)
 */

// ─── production 모듈 직접 import ───────────────────────────────────────────────
import {
  evaluatePermission,
  assertRoleAssignable,
  isValidRole,
  type PermRow,
} from "../logic"
import { buildDefaultPermissions, MENU_IDS } from "../seed/defaults"
import type { RbacAction } from "../service"
import { ROLE_KEYS, type RoleKey } from "../models/role"

// ─── 테스트용 권한 행 픽스처 ─────────────────────────────────────────────────

/** buildDefaultPermissions() 결과를 캐시 (각 테스트에서 재사용) */
const ALL_PERMS: PermRow[] = buildDefaultPermissions()

/** 특정 역할의 권한 행만 필터 */
function permsFor(roleKey: RoleKey): PermRow[] {
  return ALL_PERMS.filter((r) => r.role_key === roleKey)
}

// ─── UT-001 — 역할별 메뉴·CRUD 게이트(허용/차단) ──────────────────────────────

describe("UT-001: 역할별 메뉴·CRUD 게이트(허용/차단)", () => {
  const ACTIONS: RbacAction[] = ["read", "create", "update", "delete"]

  test("미할당(roleKey=null) 관리자는 모든 메뉴 모든 액션이 허용된다 — C1 부트스트랩 정책", () => {
    for (const menu of MENU_IDS) {
      for (const action of ACTIONS) {
        expect(
          evaluatePermission(null, menu, action, ALL_PERMS)
        ).toBe(true)
      }
    }
  })

  test("super 등급은 모든 메뉴 모든 액션이 허용된다", () => {
    const superPerms = permsFor("super")
    for (const menu of MENU_IDS) {
      for (const action of ACTIONS) {
        expect(
          evaluatePermission("super", menu, action, superPerms)
        ).toBe(true)
      }
    }
  })

  test("operation 등급은 orders 메뉴 FULL CRUD가 허용된다", () => {
    const opPerms = permsFor("operation")
    for (const action of ACTIONS) {
      expect(evaluatePermission("operation", "orders", action, opPerms)).toBe(true)
    }
  })

  test("cs 등급은 orders 메뉴에서 read/update는 허용, create/delete는 차단된다", () => {
    const csPerms = permsFor("cs")
    // cs: orders = EDIT (read+update only)
    expect(evaluatePermission("cs", "orders", "read",   csPerms)).toBe(true)
    expect(evaluatePermission("cs", "orders", "update", csPerms)).toBe(true)
    expect(evaluatePermission("cs", "orders", "create", csPerms)).toBe(false)
    expect(evaluatePermission("cs", "orders", "delete", csPerms)).toBe(false)
  })

  test("cs 등급은 permissions 메뉴에서 create/update/delete가 차단된다 — C1/C2", () => {
    const csPerms = permsFor("cs")
    // permissions 메뉴는 ROLE_FULL/EDIT_MENUS 에 없으므로 READ-only
    expect(evaluatePermission("cs", "permissions", "read",   csPerms)).toBe(true)
    expect(evaluatePermission("cs", "permissions", "create", csPerms)).toBe(false)
    expect(evaluatePermission("cs", "permissions", "update", csPerms)).toBe(false)
    expect(evaluatePermission("cs", "permissions", "delete", csPerms)).toBe(false)
  })

  test("marketer 등급은 coupons/marketing/stats FULL, 그 외(orders 등)는 read-only", () => {
    const mktPerms = permsFor("marketer")
    // FULL 메뉴
    expect(evaluatePermission("marketer", "coupons",   "create", mktPerms)).toBe(true)
    expect(evaluatePermission("marketer", "marketing", "delete", mktPerms)).toBe(true)
    expect(evaluatePermission("marketer", "stats",     "update", mktPerms)).toBe(true)
    // READ-only 메뉴 (예: orders)
    expect(evaluatePermission("marketer", "orders", "read",   mktPerms)).toBe(true)
    expect(evaluatePermission("marketer", "orders", "create", mktPerms)).toBe(false)
    expect(evaluatePermission("marketer", "orders", "delete", mktPerms)).toBe(false)
  })

  test("C2: 매핑 없는 메뉴(미시드) 비SUPER 접근은 차단(false)된다", () => {
    const opPerms = permsFor("operation")
    // 존재하지 않는 메뉴: permRows 에 일치 행 없음 → false
    expect(evaluatePermission("operation", "nonexistent_menu", "read",   opPerms)).toBe(false)
    expect(evaluatePermission("operation", "nonexistent_menu", "create", opPerms)).toBe(false)
  })

  test("cs 등급은 reviews 메뉴에서 FULL CRUD 허용된다", () => {
    const csPerms = permsFor("cs")
    for (const action of ACTIONS) {
      expect(evaluatePermission("cs", "reviews", action, csPerms)).toBe(true)
    }
  })

  test("operation 등급은 permissions 메뉴에서 read-only이다", () => {
    const opPerms = permsFor("operation")
    expect(evaluatePermission("operation", "permissions", "read",   opPerms)).toBe(true)
    expect(evaluatePermission("operation", "permissions", "create", opPerms)).toBe(false)
    expect(evaluatePermission("operation", "permissions", "update", opPerms)).toBe(false)
    expect(evaluatePermission("operation", "permissions", "delete", opPerms)).toBe(false)
  })
})

// ─── UT-002 — assertRoleAssignable C3 가드레일 + evaluatePermission 즉시 반영 ──

describe("UT-002: 역할 부여(d5 t003) 즉시 반영 + C3 가드레일", () => {

  test("역할 변경: 미할당(null) → operation 부여 후 permissions 메뉴 create 가 차단된다", () => {
    const opPerms = permsFor("operation")
    // 부여 전: null = 전체 허용
    expect(evaluatePermission(null, "permissions", "create", opPerms)).toBe(true)
    // operation 부여 후: permissions = READ-only → create = false
    expect(evaluatePermission("operation", "permissions", "create", opPerms)).toBe(false)
    // operation FULL 메뉴(orders)는 허용
    expect(evaluatePermission("operation", "orders", "create", opPerms)).toBe(true)
  })

  test("역할 재부여(operation→cs) 후 권한이 즉시 cs 기준으로 변경된다", () => {
    const opPerms = permsFor("operation")
    const csPerms = permsFor("cs")
    // operation: orders = FULL
    expect(evaluatePermission("operation", "orders", "delete", opPerms)).toBe(true)
    // cs로 변경 후: orders = EDIT (delete 불가)
    expect(evaluatePermission("cs", "orders", "delete", csPerms)).toBe(false)
    // cs: orders read는 여전히 허용
    expect(evaluatePermission("cs", "orders", "read", csPerms)).toBe(true)
  })

  test("C3: 마지막 super(superCount=1) 를 다른 등급으로 변경하면 에러가 던져진다", () => {
    // 유일한 super → operation 변경 시도: superCount=1 이면 차단
    expect(() =>
      assertRoleAssignable("operation", "super", 1)
    ).toThrow("최소 1명")
  })

  test("C3: super가 2명이면 1명을 다른 등급으로 변경 허용된다", () => {
    // superCount=2 이면 통과(에러 없음)
    expect(() =>
      assertRoleAssignable("operation", "super", 2)
    ).not.toThrow()
  })

  test("C3: 목표 등급이 super 이면 차단하지 않는다(super→super 또는 신규 super 부여)", () => {
    // targetRole = "super" → 항상 통과
    expect(() =>
      assertRoleAssignable("super", "super", 1)
    ).not.toThrow()
    expect(() =>
      assertRoleAssignable("super", null, 0)
    ).not.toThrow()
  })

  test("C3: 현재 등급이 super 가 아니면 superCount 에 무관하게 통과된다", () => {
    // currentRoleKey = "operation" → 차단 조건 미성립
    expect(() =>
      assertRoleAssignable("cs", "operation", 0)
    ).not.toThrow()
  })

  test("유효하지 않은 등급 키는 isValidRole 에서 false 를 반환한다", () => {
    expect(isValidRole("invalid_role")).toBe(false)
    expect(isValidRole("SUPER")).toBe(false)  // 대소문자 구분
    expect(isValidRole("")).toBe(false)
  })

  test("유효한 등급 키는 isValidRole 에서 true 를 반환한다", () => {
    for (const key of ROLE_KEYS) {
      expect(isValidRole(key)).toBe(true)
    }
  })
})
