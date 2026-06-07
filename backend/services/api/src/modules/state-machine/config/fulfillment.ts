/**
 * Fulfillment 도메인 state machine 정의입니다.
 *
 * 벤듀어 FulfillmentState (Created / Pending / Shipped / Delivered / Cancelled) 를 따라
 * 5종 표준 state 를 정의합니다.
 *
 * 한국 택배사 세분화 (picked_up / at_hub / out_for_delivery / delivery_failed / re_delivery_scheduled)
 * 는 설계서 §6.4 에 따라 P2 단계에서 추가합니다 (본 P1 에서는 미포함).
 */

export const FULFILLMENT_STATES = [
  "created",
  "pending",
  "shipped",
  "delivered",
  "canceled",
] as const

export type FulfillmentState = (typeof FULFILLMENT_STATES)[number]

/**
 * Fulfillment 전이 그래프입니다.
 */
export const FULFILLMENT_TRANSITIONS: Record<string, string[]> = {
  created: ["pending", "canceled"],
  pending: ["shipped", "canceled"],
  shipped: ["delivered", "canceled"],
  delivered: [],
  canceled: [],
}

export const FULFILLMENT_CONFIG = {
  domain: "fulfillment",
  states: [...FULFILLMENT_STATES],
  transitions: FULFILLMENT_TRANSITIONS,
}

export default FULFILLMENT_CONFIG
