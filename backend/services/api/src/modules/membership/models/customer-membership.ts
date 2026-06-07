/**
 * 고객 멤버십(CustomerMembership) 모델 — 고객별 누적 적립금액·현재 등급 영속.
 *
 * Medusa core(customer) 미수정 — customer_id(text) 느슨 연결.
 * 등급 구간/적립률 정책은 policy 모듈 `membership.tiers` 키에서 조회(본 테이블에 미저장).
 *
 * spec: dag/d5_회원관리/t004_멤버십등급 §7 DB (갭B 신규 모듈)
 */
import { model } from "@medusajs/framework/utils"

const CustomerMembership = model.define("customer_membership", {
  // 레코드 고유 id (prefix = mbr)
  id: model.id({ prefix: "mbr" }).primaryKey(),
  // Medusa customer.id (text 보관, core 미수정) — 고객당 1행
  customer_id: model.text().unique(),
  // 누적 적립대상 금액(원) — 등급 산정 기준
  accrued_amount: model.number().default(0),
  // 현재 등급명(일반/실버/골드/VIP 등 — 정책 기반)
  current_tier: model.text().default("일반"),
  // 최근 변경 사유(accrual=적립 누적, refund=환불 차감, manual=수동 조정)
  last_change_reason: model.text().nullable(),
})

export default CustomerMembership
