import { model } from "@medusajs/framework/utils"

/**
 * StateHistory 데이터 모델입니다.
 *
 * 모든 도메인의 모든 전이를 audit log 로 기록합니다.
 * - entity_id: 대상 entity 의 id (order_id / payment_id / refund_id / fulfillment_id)
 * - domain: 도메인 식별자 (order / payment / refund / fulfillment)
 * - from_state / to_state: 전이 정보
 * - actor: 전이를 일으킨 주체 (system / admin / customer / webhook 등)
 * - metadata: 전이 시 추가 메타데이터 (JSON) — PG 응답, tracking code, 청약철회 사유 등
 *
 * 인덱스는 (domain, entity_id) 조회를 빠르게 하기 위해 entity_id 와 domain 에 부여합니다.
 */
export const StateHistory = model.define("state_history", {
  id: model.id().primaryKey(),
  entity_id: model.text().index(),
  domain: model.text().index(),
  from_state: model.text(),
  to_state: model.text(),
  actor: model.text(),
  metadata: model.json().nullable(),
})

export default StateHistory
