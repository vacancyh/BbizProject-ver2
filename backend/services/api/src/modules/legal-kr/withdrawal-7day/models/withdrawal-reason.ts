/**
 * 청약철회 사유 모델
 *
 * 출처: 「전자상거래 등에서의 소비자보호에 관한 법률」 §17 ②
 * (반품 배송비 부담 주체 판정의 근거가 되는 사유 분류)
 *
 * - SIMPLE_CHANGE  = 단순변심         (소비자 부담)
 * - DEFECT         = 상품불량         (사업자 부담)
 * - WRONG_ITEM     = 오배송           (사업자 부담)
 * - OTHER          = 기타             (정책 따라)
 *
 * WithdrawalReasonRecord = 주문 단위 청약철회 신청 레코드.
 *  - 한 주문이 청약철회를 신청한 시점·사유·상세 설명을 저장합니다.
 *  - service.claimWithdrawal 메서드에서 생성합니다.
 */
import { model } from "@medusajs/framework/utils"

// 청약철회 사유 enum 코드값 (DB 컬럼 + 외부 노출용)
export const WITHDRAWAL_REASON_CODES = [
  "simple_change",
  "defect",
  "wrong_item",
  "other",
] as const

export type WithdrawalReasonCode = (typeof WITHDRAWAL_REASON_CODES)[number]

// TypeScript 코드 안에서 사용하기 편한 enum 표현 (한국어 라벨 및 분류용)
export enum WithdrawalReason {
  SIMPLE_CHANGE = "simple_change", // 단순변심
  DEFECT = "defect",               // 상품불량
  WRONG_ITEM = "wrong_item",       // 오배송
  OTHER = "other",                 // 기타
}

const WithdrawalReasonRecord = model.define("withdrawal_reason_record", {
  // 레코드 고유 id (prefix = wrsn)
  id: model.id({ prefix: "wrsn" }).primaryKey(),
  // 메두사 order.id 와 link 로 연결되는 주문 식별자
  order_id: model.text().index("IDX_withdrawal_reason_record_order_id"),
  // 사유 코드 (단순변심 / 상품불량 / 오배송 / 기타)
  reason: model.enum([...WITHDRAWAL_REASON_CODES]),
  // 소비자가 입력한 상세 설명 (선택)
  description: model.text().nullable(),
  // 청약철회 신청 시각 (전자상거래법 §18 ① 환불 기산점)
  claimed_at: model.dateTime(),
})

export default WithdrawalReasonRecord
