/**
 * Order 도메인 state machine 정의입니다.
 *
 * 메두사 v2.15.3 의 OrderStatus enum 6종 (pending / completed / draft / archived / canceled / requires_action)
 * 위에 한국 특화 state 를 확장 정의합니다.
 *
 * 포함 state 카테고리:
 * - 메두사 OrderStatus 6종
 * - 한국 PG verify 단계 5종 (payment-process 와 공유 개념)
 * - 한국 청약철회 단계 4종 (refund-process 와 공유 개념)
 * - 만 14세 미만 동의 단계 2종
 *
 * 본 정의는 설계서 §6.1 / §6.2 / §6.3 에 따른 한국 비즈니스 특화 state 포함 입니다.
 */

export const ORDER_STATES = [
  // 메두사 표준 6종
  "pending",
  "completed",
  "draft",
  "archived",
  "canceled",
  "requires_action",

  // 진행 단계 (벤듀어 default order process 확장)
  "adding_items",
  "arranging_payment",
  "payment_authorized",
  "payment_settled",
  "partially_shipped",
  "shipped",
  "partially_delivered",
  "delivered",

  // 한국 PG verify 단계 (§6.1)
  "pg_verification_pending",
  "pg_verified",
  "pg_failed",
  "vbank_pending_deposit",
  "vbank_expired",

  // 한국 청약철회 (§6.2)
  "withdrawal_requested",
  "withdrawal_approved",
  "withdrawal_rejected",
  "withdrawal_refunded",

  // 만 14세 미만 동의 (§6.3)
  "age_verification_pending",
  "age_verified",
] as const

export type OrderState = (typeof ORDER_STATES)[number]

/**
 * Order 전이 그래프입니다.
 * 키 = from state, 값 = 허용되는 to state 배열.
 * 빈 배열 = terminal state (전이 불가).
 */
export const ORDER_TRANSITIONS: Record<string, string[]> = {
  // 표준 라이프사이클 시작
  draft: ["adding_items", "canceled"],
  adding_items: ["age_verification_pending", "arranging_payment", "canceled"],

  // 만 14세 미만 동의 분기
  age_verification_pending: ["age_verified", "canceled"],
  age_verified: ["arranging_payment", "canceled"],

  // 결제 진행
  arranging_payment: [
    "pg_verification_pending",
    "vbank_pending_deposit",
    "payment_authorized",
    "canceled",
  ],
  pg_verification_pending: ["pg_verified", "pg_failed", "canceled"],
  pg_verified: ["payment_authorized", "pg_failed"],
  pg_failed: [],
  vbank_pending_deposit: ["payment_settled", "vbank_expired", "canceled"],
  vbank_expired: [],
  payment_authorized: ["payment_settled", "canceled"],
  payment_settled: ["partially_shipped", "shipped", "withdrawal_requested", "canceled"],

  // 배송 진행
  partially_shipped: ["shipped", "partially_delivered"],
  shipped: ["partially_delivered", "delivered"],
  partially_delivered: ["delivered"],
  delivered: ["completed", "withdrawal_requested"],

  // 청약철회 분기
  withdrawal_requested: ["withdrawal_approved", "withdrawal_rejected"],
  withdrawal_approved: ["withdrawal_refunded", "withdrawal_rejected"],
  withdrawal_rejected: [],
  withdrawal_refunded: ["completed"],

  // 메두사 표준 추가 state
  pending: ["arranging_payment", "requires_action", "canceled"],
  requires_action: ["arranging_payment", "canceled"],

  // 종료 state
  completed: ["archived"],
  canceled: ["archived"],
  archived: [],
}

export const ORDER_CONFIG = {
  domain: "order",
  states: [...ORDER_STATES],
  transitions: ORDER_TRANSITIONS,
}

export default ORDER_CONFIG
