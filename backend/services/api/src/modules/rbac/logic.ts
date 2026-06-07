/**
 * RBAC 순수 로직 모듈 — DB·MedusaService 의존 없음.
 *
 * service.ts 는 DB 입출력만 담당하고, 권한 판정·유효성 검사 로직은 모두 여기 위임한다.
 *
 * export 함수 목록:
 *  - isValidRole(key): boolean
 *      ROLE_KEYS 에 포함되는 유효한 등급 키인지 검사.
 *  - evaluatePermission(roleKey, menuId, action, permRows): boolean
 *      역할 키 + 메뉴 + 액션 + 권한 행 목록을 받아 허용/차단 여부를 반환.
 *      미할당(null) / super = 전체 허용(true), 매핑 없으면 false.
 *  - assertRoleAssignable(targetRole, currentRoleKey, superCount): void
 *      C3 가드레일: 마지막 super 를 다른 등급으로 변경하려 할 때 에러를 던진다.
 */

import { ROLE_KEYS, type RoleKey } from "./models/role"
import type { RbacAction } from "./service"

// ─── 타입 ───────────────────────────────────────────────────────────────────

/** DB 권한 행의 최소 인터페이스 (listRolePermissions 반환 행과 호환) */
export interface PermRow {
  role_key: string
  menu_id: string
  can_read: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
}

// ─── 순수 함수 ───────────────────────────────────────────────────────────────

/**
 * 유효한 등급 키 여부 반환.
 *
 * @param key 검사할 등급 키 문자열
 * @returns ROLE_KEYS 포함 여부
 */
export function isValidRole(key: string): key is RoleKey {
  return ROLE_KEYS.includes(key as RoleKey)
}

/**
 * 역할 + 메뉴 + 액션 기준 권한 허용/차단 판정.
 *
 * 규칙:
 *  1. roleKey 가 null(미할당) 또는 "super" → 항상 true
 *  2. permRows 에서 role_key + menu_id 일치 행 탐색 → 없으면 false
 *  3. 행의 can_<action> 값 반환
 *
 * @param roleKey  사용자의 현재 등급 키 (null = 미할당)
 * @param menuId   접근 요청 메뉴 id
 * @param action   요청 액션 (read|create|update|delete)
 * @param permRows listRolePermissions 반환 행 배열
 * @returns 허용이면 true, 차단이면 false
 */
export function evaluatePermission(
  roleKey: RoleKey | null,
  menuId: string,
  action: RbacAction,
  permRows: PermRow[]
): boolean {
  // C1·C2 기반 부트스트랩 정책: 미할당 / super = 전체 허용
  if (!roleKey || roleKey === "super") {
    return true
  }
  const row = permRows.find(
    (r) => r.role_key === roleKey && r.menu_id === menuId
  )
  if (!row) {
    // C2: 매핑 없는 메뉴 = 차단
    return false
  }
  return Boolean((row as unknown as Record<string, unknown>)[`can_${action}`])
}

/**
 * C3 가드레일: 마지막 super 관리자 0명화 차단.
 *
 * 호출 조건: 변경 대상의 현재 등급이 super 이고, 변경 목표 등급이 super 가 아닌 경우.
 *
 * @param targetRole       변경 목표 등급 키
 * @param currentRoleKey   변경 대상의 현재 등급 키 (null = 미할당)
 * @param superCount       현재 super 등급 관리자 수
 * @throws 마지막 super 이면 에러
 */
export function assertRoleAssignable(
  targetRole: string,
  currentRoleKey: string | null,
  superCount: number
): void {
  if (targetRole !== "super" && currentRoleKey === "super" && superCount <= 1) {
    throw new Error(
      "[rbac] 최고관리자(super)는 최소 1명이 반드시 존재해야 합니다. 등급 변경이 거부되었습니다."
    )
  }
}
