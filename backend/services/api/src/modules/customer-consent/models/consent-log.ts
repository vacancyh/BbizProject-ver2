/**
 * 동의 이력(ConsentLog) 모델 — append-only.
 *
 * 동의/철회를 1행씩 적재(최신 행이 현재 상태). Medusa core(customer) 미수정.
 *
 * spec: dag/d5_회원관리/t008_동의이력 §7 DB (갭B 신규 모듈)
 */
import { model } from "@medusajs/framework/utils"

const ConsentLog = model.define("consent_log", {
  // 레코드 고유 id (prefix = cnst)
  id: model.id({ prefix: "cnst" }).primaryKey(),
  // Medusa customer.id (text 보관)
  customer_id: model.text().index("IDX_consent_log_customer_id"),
  // 채널: marketing / terms / privacy / sms / email
  channel: model.text(),
  // 동의 여부(true=동의, false=철회)
  agreed: model.boolean(),
  // 기록 시각(ISO)
  recorded_at: model.text(),
})

export default ConsentLog
