/**
 * Payment 도메인 state machine 정의입니다.
 *
 * 메두사 v2.15.3 의 PaymentSessionStatus enum 6종
 * (authorized / captured / pending / requires_more / error / canceled)
 * 위에 한국 PG verify 단계 5종 (설계서 §6.1) 을 확장 정의합니다.
 *
 * 한국 PG (KCP / 토스 / 카카오페이 / 이니시스 / 나이스) 의 공통 verify 흐름:
 * - redirect 결제: pg_verification_pending → pg_verified → authorized → captured
 * - 가상계좌: vbank_pending_deposit → captured (입금 확인 시) 또는 vbank_expired
 */

export const PAYMENT_STATES = [
  // 메두사 표준 6종
  "pending",
  "authorized",
  "captured",
  "requires_more",
  "error",
  "canceled",

  // 한국 PG verify 단계 (§6.1)
  "pg_verification_pending",
  "pg_verified",
  "pg_failed",
  "vbank_pending_deposit",
  "vbank_expired",
] as const

export type PaymentState = (typeof PAYMENT_STATES)[number]

/**
 * Payment 전이 그래프입니다.
 */
export const PAYMENT_TRANSITIONS: Record<string, string[]> = {
  // 신규 결제 세션
  pending: [
    "pg_verification_pending",
    "vbank_pending_deposit",
    "authorized",
    "requires_more",
    "error",
    "canceled",
  ],

  // 한국 PG verify
  pg_verification_pending: ["pg_verified", "pg_failed", "canceled"],
  pg_verified: ["authorized", "pg_failed"],
  pg_failed: [],
  vbank_pending_deposit: ["captured", "vbank_expired", "canceled"],
  vbank_expired: [],

  // 표준 결제 흐름
  authorized: ["captured", "canceled", "error"],
  captured: ["canceled"],
  requires_more: ["authorized", "pg_verification_pending", "canceled", "error"],

  // 종료 state
  error: [],
  canceled: [],
}

export const PAYMENT_CONFIG = {
  domain: "payment",
  states: [...PAYMENT_STATES],
  transitions: PAYMENT_TRANSITIONS,
}

export default PAYMENT_CONFIG
