/**
 * 고객 제재(CustomerSanction) 모델 — 제재 이력(append) + 현재 상태.
 *
 * 단계 상승 시 1행 적재. 최신 행이 현재 제재. 해제 시 active=false.
 * Medusa core(customer) 미수정 — customer_id(text) 느슨 연결.
 *
 * spec: dag/d5_회원관리/t006_제재블랙리스트 §7 DB (갭B 신규 모듈)
 */
import { model } from "@medusajs/framework/utils"

const CustomerSanction = model.define("customer_sanction", {
  // 레코드 고유 id (prefix = sanc)
  id: model.id({ prefix: "sanc" }).primaryKey(),
  // Medusa customer.id (text 보관)
  customer_id: model.text().index("IDX_customer_sanction_customer_id"),
  // 제재 단계: warn / seven_days / thirty_days / permanent
  level: model.text(),
  // 제재 사유
  reason: model.text().nullable(),
  // 제재 시작 시각(ISO)
  started_at: model.text(),
  // 제재 만료 시각(ISO) — 영구는 null
  until_at: model.text().nullable(),
  // 해제 여부(true=유효, false=해제됨)
  active: model.boolean().default(true),
})

export default CustomerSanction
