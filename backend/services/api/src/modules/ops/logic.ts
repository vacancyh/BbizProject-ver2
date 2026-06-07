/**
 * ops 순수 로직 모듈 — DB·MedusaService·외부 IO 의존 없음.
 *
 * 점검모드(scope 전환 판정) + 헬스(DB/Redis 상태 판정)의 순수 함수를 담당한다.
 * service.ts 는 DB 입출력만 담당하고, 판정 로직은 모두 여기에 위임한다.
 *
 * export 함수 목록:
 *  - isValidScope(scope): boolean
 *      점검모드 scope 값이 허용 집합에 포함되는지 검사.
 *  - isValidMaintenanceMessage(msg): boolean
 *      안내 메시지 길이(0~200자) 검증.
 *  - resolveHealthStatus(dbOk, redisOk): HealthStatus
 *      DB/Redis 가용 여부를 받아 전체 health 상태를 판정.
 *  - canToggleMaintenance(roleKey): boolean
 *      SUPER 등급만 점검모드 전환을 허용(true).
 */

// ─── 상수 ──────────────────────────────────────────────────────────────────

/** 점검모드 scope 허용값 (t009 §4 I1) */
export const MAINTENANCE_SCOPES = ["all", "storefront", "admin"] as const
export type MaintenanceScope = (typeof MAINTENANCE_SCOPES)[number]

/** 점검모드 안내 메시지 최대 길이 (t009 §4 I2) */
export const MAINTENANCE_MESSAGE_MAX = 200

/** 헬스 상태 enum */
export type ServiceStatus = "up" | "down"

export interface HealthStatus {
  db: ServiceStatus
  redis: ServiceStatus
  /** 전체 상태: db·redis 모두 up 일 때만 "up" */
  overall: ServiceStatus
  /** HTTP 응답 코드: overall up = 200, down = 503 */
  httpCode: 200 | 503
}

// ─── 순수 함수 ───────────────────────────────────────────────────────────────

/**
 * 점검모드 scope 유효성 검사.
 *
 * @param scope 입력 scope 문자열
 * @returns MAINTENANCE_SCOPES 포함 여부
 */
export function isValidScope(scope: string): scope is MaintenanceScope {
  return MAINTENANCE_SCOPES.includes(scope as MaintenanceScope)
}

/**
 * 점검모드 안내 메시지 길이 검증.
 *
 * @param msg 안내 메시지 (undefined/빈 문자열 허용 — 선택 입력)
 * @returns 0~200자 이내이면 true, 초과이면 false
 */
export function isValidMaintenanceMessage(msg: string | undefined): boolean {
  if (msg === undefined || msg === null) return true
  return msg.length <= MAINTENANCE_MESSAGE_MAX
}

/**
 * DB/Redis 가용 여부를 받아 전체 health 상태를 판정.
 *
 * - db·redis 모두 up = overall "up" / httpCode 200
 * - 하나라도 down = overall "down" / httpCode 503
 *
 * @param dbOk   DB 접속 성공 여부
 * @param redisOk Redis 접속 성공 여부
 * @returns HealthStatus 객체
 */
export function resolveHealthStatus(
  dbOk: boolean,
  redisOk: boolean
): HealthStatus {
  const db: ServiceStatus = dbOk ? "up" : "down"
  const redis: ServiceStatus = redisOk ? "up" : "down"
  const overall: ServiceStatus = dbOk && redisOk ? "up" : "down"
  const httpCode: 200 | 503 = overall === "up" ? 200 : 503
  return { db, redis, overall, httpCode }
}

/**
 * 점검모드 전환 권한 판정 (t009 §8 C1, t010 rbac SUPER 정합).
 *
 * SUPER 등급만 true — 그 외(operation/cs/marketer/미할당) = false.
 *
 * @param roleKey 요청 관리자의 등급 키 (null = 미할당)
 * @returns SUPER 이면 true, 그 외 false
 */
export function canToggleMaintenance(roleKey: string | null): boolean {
  return roleKey === "super"
}
