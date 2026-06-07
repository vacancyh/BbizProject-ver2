/**
 * 감사 로그 순수 로직 모듈 — DB·MedusaService 의존 없음.
 *
 * service.ts 는 DB 입출력만 담당하고, append-only 불변성 판정 및 권한 판정 로직은 여기에 위임한다.
 *
 * export 함수 목록:
 *  - canWriteAudit(method): boolean
 *      HTTP 메서드가 감사 대상 write 액션인지 판정(POST/PUT/PATCH/DELETE = true).
 *  - isAppendOnlyBlocked(operation): boolean
 *      'update' 또는 'delete' 오퍼레이션은 append-only 위반으로 차단(true).
 *  - canReadAuditLogs(roleKey, permRows): boolean
 *      RBAC 권한 행을 받아 audit-logs 메뉴 read 허용 여부를 반환.
 *      super/null(미할당) = true, 그 외 = permRows 에서 audit-logs read 판정.
 */

import type { PermRow } from "../rbac/logic"

// ─── 상수 ──────────────────────────────────────────────────────────────────

/** 감사 대상 write HTTP 메서드 집합 */
export const AUDIT_WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const
export type AuditWriteMethod = (typeof AUDIT_WRITE_METHODS)[number]

/** append-only 위반 오퍼레이션 집합 */
export const APPEND_ONLY_BLOCKED_OPS = ["update", "delete"] as const
export type BlockedOp = (typeof APPEND_ONLY_BLOCKED_OPS)[number]

// ─── 순수 함수 ───────────────────────────────────────────────────────────────

/**
 * HTTP 메서드가 감사 기록 대상 write 액션인지 판정.
 *
 * @param method HTTP 메서드 문자열 (대소문자 구분 없음)
 * @returns POST/PUT/PATCH/DELETE 이면 true, 그 외(GET/HEAD 등) false
 */
export function canWriteAudit(method: string): boolean {
  return AUDIT_WRITE_METHODS.includes(
    method.toUpperCase() as AuditWriteMethod
  )
}

/**
 * append-only 불변성 위반 오퍼레이션 차단 판정.
 *
 * audit_log 테이블은 INSERT 만 허용한다. 서비스 레이어 또는 미들웨어에서
 * 이 함수를 호출하여 update/delete 시도를 사전 차단한다.
 *
 * @param operation 시도하는 오퍼레이션 ('update' | 'delete' | 'insert' | 기타)
 * @returns 'update' 또는 'delete' 이면 true(= 차단해야 함)
 */
export function isAppendOnlyBlocked(operation: string): boolean {
  return APPEND_ONLY_BLOCKED_OPS.includes(
    operation.toLowerCase() as BlockedOp
  )
}

/**
 * RBAC 권한 행을 받아 audit-logs 메뉴 read 허용 여부를 반환.
 *
 * 규칙:
 *  1. roleKey 가 null(미할당) 또는 "super" → true (전체 허용)
 *  2. permRows 에서 role_key + menu_id="audit-logs" 행 탐색
 *  3. 행의 can_read 반환. 행 없으면 false.
 *
 * @param roleKey  사용자의 현재 등급 키 (null = 미할당)
 * @param permRows listRolePermissions 반환 행 배열
 * @returns 허용이면 true, 차단이면 false
 */
export function canReadAuditLogs(
  roleKey: string | null,
  permRows: PermRow[]
): boolean {
  if (!roleKey || roleKey === "super") {
    return true
  }
  const row = permRows.find(
    (r) => r.role_key === roleKey && r.menu_id === "audit-logs"
  )
  if (!row) return false
  return row.can_read
}
