/**
 * 포인트 원장(PointLedger) 모델 — append-only.
 *
 * 적립/사용/소멸을 1행씩 적재(수정·삭제 지양). 잔액은 원장 합산으로 계산.
 * Medusa core(customer) 미수정 — customer_id(text) 느슨 연결.
 *
 * spec: dag/d5_회원관리/t005_포인트 §7 DB (갭B 신규 모듈)
 */
import { model } from "@medusajs/framework/utils"

const PointLedger = model.define("point_ledger", {
  // 레코드 고유 id (prefix = pt)
  id: model.id({ prefix: "pt" }).primaryKey(),
  // Medusa customer.id (text 보관)
  customer_id: model.text().index("IDX_point_ledger_customer_id"),
  // 항목 유형: earn(적립) / redeem(사용) / expire(소멸)
  entry_type: model.text(),
  // 금액(포인트) — earn 양수, redeem/expire 음수
  amount: model.number(),
  // 사유(signup/purchase/review/referral/attendance/manual 등)
  reason: model.text().nullable(),
  // earn 항목의 유효기간(ISO 문자열) — redeem/expire 는 null
  expires_at: model.text().nullable(),
})

export default PointLedger
