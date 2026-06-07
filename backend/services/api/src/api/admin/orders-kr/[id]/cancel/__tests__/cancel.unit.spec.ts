/**
 * 강제취소 순수 로직 단위 테스트
 *
 * UT-001  강제취소 원자성 — validateCancelReason + buildCancelIdempotencyKey 정상 경로
 * UT-002  부분 실패 롤백 — (순수 로직 범위: 잘못된 입력 검증)
 * UT-003  권한/이중확인 — reason enum 화이트리스트 + 미입력 차단
 *
 * spec: dag/d2_주문관리/t010_강제취소.md §9, unit_012_강제취소.md
 * §V0-2: validateCancelReason·buildCancelIdempotencyKey = route.ts production 실호출 함수
 */
import {
  validateCancelReason,
  buildCancelIdempotencyKey,
  CANCEL_REASON_VALUES,
} from "../cancel-logic"

// ──────────────────────────────────────────────────────────────────────────────
// UT-001  강제취소 원자성 — 정상 입력 경로
// ──────────────────────────────────────────────────────────────────────────────
describe("UT-001: validateCancelReason — 정상 enum 값 허용", () => {
  it.each(CANCEL_REASON_VALUES as unknown as string[])(
    "UT-001-%s: reason=%s → valid=true",
    (r) => {
      const result = validateCancelReason(r)
      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.reason).toBe(r)
      }
    }
  )

  it("UT-001-trim: 앞뒤 공백이 있어도 정상 처리", () => {
    const result = validateCancelReason("  fraud  ")
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.reason).toBe("fraud")
    }
  })
})

describe("UT-001: buildCancelIdempotencyKey — 정상 경로", () => {
  it("UT-001-key: 형식 = {orderId}:cancel:{nonce}", () => {
    const key = buildCancelIdempotencyKey("order-123", "uuid-abc")
    expect(key).toBe("order-123:cancel:uuid-abc")
  })

  it("UT-001-key-idempotent: 동일 orderId+nonce 는 항상 같은 키", () => {
    const key1 = buildCancelIdempotencyKey("order-999", "nonce-x")
    const key2 = buildCancelIdempotencyKey("order-999", "nonce-x")
    expect(key1).toBe(key2)
  })

  it("UT-001-key-diff: 서로 다른 nonce 는 다른 키", () => {
    const key1 = buildCancelIdempotencyKey("order-999", "nonce-1")
    const key2 = buildCancelIdempotencyKey("order-999", "nonce-2")
    expect(key1).not.toBe(key2)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// UT-002  부분 실패 롤백 — 잘못된 입력 거부
// ──────────────────────────────────────────────────────────────────────────────
describe("UT-002: buildCancelIdempotencyKey — 잘못된 입력 예외", () => {
  it("UT-002-orderId-empty: orderId 비어있으면 예외", () => {
    expect(() => buildCancelIdempotencyKey("", "nonce-abc")).toThrow()
  })

  it("UT-002-nonce-empty: nonce 비어있으면 예외", () => {
    expect(() => buildCancelIdempotencyKey("order-123", "")).toThrow()
  })

  it("UT-002-orderId-whitespace: orderId 공백만이면 예외", () => {
    expect(() => buildCancelIdempotencyKey("   ", "nonce-abc")).toThrow()
  })

  it("UT-002-nonce-whitespace: nonce 공백만이면 예외", () => {
    expect(() => buildCancelIdempotencyKey("order-123", "   ")).toThrow()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// UT-003  권한/이중확인 — reason enum 화이트리스트 + 사유 미입력 차단
// ──────────────────────────────────────────────────────────────────────────────
describe("UT-003: validateCancelReason — 사유 미입력/비enum 차단 (spec I1 검증 규칙)", () => {
  it("UT-003-empty: 빈 문자열 → valid=false, 필수 메시지", () => {
    const result = validateCancelReason("")
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.message).toContain("필수")
    }
  })

  it("UT-003-undefined: undefined → valid=false", () => {
    const result = validateCancelReason(undefined)
    expect(result.valid).toBe(false)
  })

  it("UT-003-null: null → valid=false", () => {
    const result = validateCancelReason(null)
    expect(result.valid).toBe(false)
  })

  it("UT-003-invalid-enum: '관리자 강제취소'(하드코딩값) → valid=false, enum 메시지", () => {
    const result = validateCancelReason("관리자 강제취소")
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.message).toContain("fraud/staff/inventory/other")
    }
  })

  it("UT-003-invalid-enum-2: 'cancel' → valid=false (enum 목록에 없음)", () => {
    const result = validateCancelReason("cancel")
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.message).toContain("fraud/staff/inventory/other")
    }
  })

  it("UT-003-invalid-enum-3: '400 bad reason' → valid=false", () => {
    const result = validateCancelReason("400 bad reason")
    expect(result.valid).toBe(false)
  })

  it("UT-003-invalid-type: number 타입 → valid=false", () => {
    const result = validateCancelReason(123)
    expect(result.valid).toBe(false)
  })
})
