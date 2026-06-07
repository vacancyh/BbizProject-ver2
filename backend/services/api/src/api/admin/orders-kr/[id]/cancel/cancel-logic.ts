/**
 * 강제취소 순수 로직 (DB·req 의존 없음 — 단위테스트 가능).
 *
 * validateCancelReason  : reason enum 화이트리스트 검증 → { valid, message }
 * buildCancelIdempotencyKey : "{orderId}:cancel:{nonce}" 형식의 멱등키 생성
 *
 * spec: dag/d2_주문관리/t010_강제취소.md §4 I1, §8 C1
 * unit: unit_012_강제취소.md UT-003
 *
 * §V0-2: 본 모듈의 함수는 route.ts 가 production 에서 실호출한다.
 *        dead code 금지 — export 함수 모두 route 에서 사용.
 */

/** 허용 취소 사유 enum */
export const CANCEL_REASON_VALUES = ["fraud", "staff", "inventory", "other"] as const
export type CancelReason = (typeof CANCEL_REASON_VALUES)[number]

/** validateCancelReason 반환 타입 */
export type CancelReasonValidation =
  | { valid: true; reason: CancelReason }
  | { valid: false; message: string }

/**
 * 취소 사유 enum 검증.
 *
 * - 미입력(undefined/null/빈 문자열) → invalid + "취소 사유는 필수입니다."
 * - enum 외 값 → invalid + "취소 사유는 fraud/staff/inventory/other 중 하나여야 합니다."
 * - 정상 → { valid: true, reason }
 *
 * @param reason  클라이언트에서 전달된 취소 사유 문자열
 */
export function validateCancelReason(reason: unknown): CancelReasonValidation {
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return { valid: false, message: "취소 사유는 필수입니다." }
  }
  const trimmed = reason.trim()
  if (!(CANCEL_REASON_VALUES as readonly string[]).includes(trimmed)) {
    return {
      valid: false,
      message: "취소 사유는 fraud/staff/inventory/other 중 하나여야 합니다.",
    }
  }
  return { valid: true, reason: trimmed as CancelReason }
}

/**
 * 강제취소 멱등키 생성.
 *
 * 형식: "{orderId}:cancel:{nonce}"
 *
 * @param orderId  주문 ID
 * @param nonce    클라이언트 제공 임의값 (UUID 등)
 * @returns 멱등키 문자열
 * @throws Error orderId 또는 nonce 가 비어있을 경우
 */
export function buildCancelIdempotencyKey(orderId: string, nonce: string): string {
  if (!orderId || !orderId.trim()) {
    throw new Error("[cancel-logic] orderId 가 비어 있습니다.")
  }
  if (!nonce || !nonce.trim()) {
    throw new Error("[cancel-logic] nonce 가 비어 있습니다.")
  }
  return `${orderId}:cancel:${nonce}`
}
