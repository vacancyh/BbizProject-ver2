/**
 * 정책 저장소 순수 로직 모듈 — DB·MedusaService 의존 없음.
 *
 * service.ts 는 DB 입출력만 담당하고, 확인 검증·값 타입 검증은 여기서 수행한다.
 *
 * export 함수 목록:
 *  - requireConfirm(confirm): void
 *      confirm 이 true 가 아니면 에러를 던진다(이중확인 미수행 차단).
 *  - validatePolicyValue(value, valueType): void
 *      정책 값을 value_type(string/number/boolean) 기준으로 검증.
 *      타입 불일치 시 에러를 던진다.
 *  - isSuperRole(roleKey): boolean
 *      등급 키가 super 인지 판정(정책 write 권한 보조 판정).
 */

// ─── 타입 ───────────────────────────────────────────────────────────────────

/** 정책 값 타입(FE 위젯 결정용) — json = 복합 정책(배열/객체, 예: membership.tiers) */
export type PolicyValueType = "string" | "number" | "boolean" | "json"

// ─── 순수 함수 ───────────────────────────────────────────────────────────────

/**
 * 이중확인 필수 게이트.
 *
 * service.set 이 confirm=true 를 받아 호출한다.
 * route 핸들러가 본 함수를 직접 호출하여 early-return 패턴으로 사용할 수도 있다.
 *
 * @param confirm FE ConfirmModal 에서 전달하는 이중확인 플래그
 * @throws confirm 이 true 가 아니면 에러
 */
export function requireConfirm(confirm: unknown): void {
  if (confirm !== true) {
    throw new Error("[policy] 정책 변경에는 이중확인(confirm=true)이 필요합니다.")
  }
}

/**
 * 정책 값 타입 검증.
 *
 * value_type 이 "number" 이면 유한 숫자(isFinite), "boolean" 이면 boolean 타입,
 * "string" 이면 string 타입인지 검사한다. 불일치 시 에러.
 *
 * @param value  검증할 정책 값
 * @param valueType 정책 DB 필드 value_type (string/number/boolean)
 * @throws 타입 불일치 시 에러
 */
export function validatePolicyValue(value: unknown, valueType: PolicyValueType): void {
  if (valueType === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `[policy] 정책 값 형식 오류: value_type="${valueType}" 이나 입력값이 유한 숫자가 아닙니다 (받은 값: ${JSON.stringify(value)}).`
      )
    }
  } else if (valueType === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(
        `[policy] 정책 값 형식 오류: value_type="${valueType}" 이나 입력값이 boolean 이 아닙니다 (받은 값: ${JSON.stringify(value)}).`
      )
    }
  } else if (valueType === "json") {
    // 복합 정책(배열/객체) — null 이 아닌 object 면 통과(세부 스키마 검증은 도메인 룰이 담당)
    if (value === null || typeof value !== "object") {
      throw new Error(
        `[policy] 정책 값 형식 오류: value_type="${valueType}" 이나 객체/배열이 아닙니다 (받은 값: ${JSON.stringify(value)}).`
      )
    }
  } else {
    // "string" 또는 기타
    if (typeof value !== "string") {
      throw new Error(
        `[policy] 정책 값 형식 오류: value_type="${valueType}" 이나 입력값이 string 이 아닙니다 (받은 값: ${JSON.stringify(value)}).`
      )
    }
  }
}

/**
 * SUPER 등급 여부 판정(정책 write 보조).
 *
 * t010 rbac.evaluatePermission 과 일관성 유지:
 *  - null(미할당) 또는 "super" → true(허용)
 *  - 그 외 → false(정책 write 차단 대상)
 *
 * 미들웨어(rbac guard)가 1차 차단하지만, service 레이어에서도 판정 근거를 유지한다.
 *
 * @param roleKey 관리자 등급 키 (null = 미할당)
 */
export function isSuperRole(roleKey: string | null): boolean {
  return roleKey === null || roleKey === "super"
}
