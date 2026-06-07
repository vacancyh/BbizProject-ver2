/**
 * Refund 도메인 state machine 정의입니다.
 *
 * 벤듀어 RefundState 3종 (pending / settled / failed) 위에
 * 한국 청약철회법 (전자상거래 등에서의 소비자보호에 관한 법률 §17) 4단계 (설계서 §6.2) 를 확장합니다.
 *
 * 청약철회 흐름:
 * - withdrawal_requested → withdrawal_approved → withdrawal_refunded → settled
 * - 거부 시: withdrawal_rejected (terminal)
 */

export const REFUND_STATES = [
  // 표준 RefundState 3종
  "pending",
  "settled",
  "failed",

  // 한국 청약철회 (§6.2)
  "withdrawal_requested",
  "withdrawal_approved",
  "withdrawal_rejected",
  "withdrawal_refunded",
] as const

export type RefundState = (typeof REFUND_STATES)[number]

/**
 * Refund 전이 그래프입니다.
 */
export const REFUND_TRANSITIONS: Record<string, string[]> = {
  // 청약철회 진입
  withdrawal_requested: ["withdrawal_approved", "withdrawal_rejected"],
  withdrawal_approved: ["withdrawal_refunded", "failed"],
  withdrawal_rejected: [],
  withdrawal_refunded: ["settled", "failed"],

  // 표준 환불 흐름
  pending: ["settled", "failed", "withdrawal_requested"],
  settled: [],
  failed: [],
}

export const REFUND_CONFIG = {
  domain: "refund",
  states: [...REFUND_STATES],
  transitions: REFUND_TRANSITIONS,
}

export default REFUND_CONFIG
