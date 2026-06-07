/**
 * 멱등키 순수 로직 (DB·req 의존 없음 — 단위테스트 가능).
 *
 * buildIdempotencyKey  : "{orderId}:refund:{nonce}" 형식의 키 생성.
 *
 * spec: dag/d2_주문관리/t007_환불.md §4 I2, §8 C1
 * unit: unit_009_환불.md UT-003
 */

/**
 * 환불 멱등키를 생성합니다.
 *
 * 형식: "{orderId}:refund:{nonce}"
 *
 * @param orderId  주문 ID
 * @param nonce    클라이언트 제공 임의값 (UUID 등)
 * @returns 멱등키 문자열
 * @throws Error orderId 또는 nonce 가 비어있을 경우
 */
export function buildIdempotencyKey(orderId: string, nonce: string): string {
  if (!orderId || !orderId.trim()) {
    throw new Error("[idempotency-logic] orderId 가 비어 있습니다.")
  }
  if (!nonce || !nonce.trim()) {
    throw new Error("[idempotency-logic] nonce 가 비어 있습니다.")
  }
  return `${orderId}:refund:${nonce}`
}
