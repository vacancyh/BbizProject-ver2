/**
 * 청약철회 가능 여부 모델
 *
 * 출처: 「전자상거래 등에서의 소비자보호에 관한 법률」 §17 ①
 * (소비자는 재화 인도일로부터 7 일 이내 청약을 철회할 수 있음)
 *
 * - delivered_at        = 인도일 (7 일 기산점)
 * - eligible_until      = delivered_at + 7 일 (영업일·공휴일 포함, 달력일 기준)
 * - is_eligible         = 청약철회 가능 여부 (예외 사유 미해당 = true)
 * - disqualified_reason = 예외 사유 (§17 ② 단서: 소비자 책임 멸실, 사용으로 가치 감소, 시간 경과로 재판매 곤란, 복제 가능 디지털 등)
 *
 * 한 주문에 하나의 eligibility 레코드만 가정합니다 (1:1 link).
 */
import { model } from "@medusajs/framework/utils"

const WithdrawalEligibility = model.define("withdrawal_eligibility", {
  // 레코드 고유 id (prefix = wele)
  id: model.id({ prefix: "wele" }).primaryKey(),
  // 메두사 order.id 와 link 로 연결되는 주문 식별자 (1:1)
  order_id: model
    .text()
    .unique("IDX_withdrawal_eligibility_order_id_unique"),
  // 인도일 (배송 완료 이벤트 = order.delivered 의 페이로드)
  delivered_at: model.dateTime(),
  // 청약철회 가능 마감 시각 (delivered_at + 7 일)
  eligible_until: model.dateTime(),
  // 청약철회 가능 여부 (예외 사유 미해당 = true)
  is_eligible: model.boolean().default(true),
  // 예외 사유 (§17 ② 단서) — null 이면 일반 케이스, 값 있으면 청약철회 제한
  disqualified_reason: model.text().nullable(),
})

export default WithdrawalEligibility
