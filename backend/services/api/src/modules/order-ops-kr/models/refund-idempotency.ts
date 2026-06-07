/**
 * 환불 멱등키 캐시(RefundIdempotency).
 *
 * 멱등키(key) UNIQUE. 동일 키 재요청 시 cached_response 를 그대로 반환.
 * 24시간 후 만료(expires_at). 만료 판단은 route 에서 수행.
 *
 * spec: dag/d2_주문관리/t007_환불.md §4 I2, §7 DB(idempotency_key), §8 C1
 * unit: unit_009_환불.md UT-003
 */
import { model } from "@medusajs/framework/utils"

const RefundIdempotency = model.define("refund_idempotency", {
  // 레코드 고유 id (prefix = ridem)
  id: model.id({ prefix: "ridem" }).primaryKey(),
  // 멱등키 — UNIQUE (route 에서 중복 체크 후 적재)
  key: model.text().index("IDX_refund_idempotency_key"),
  // 최초 응답 캐시 (JSON)
  cached_response: model.json(),
  // 만료 일시 (기본: 적재 시각 + 24h, route 에서 설정)
  expires_at: model.dateTime(),
})

export default RefundIdempotency
