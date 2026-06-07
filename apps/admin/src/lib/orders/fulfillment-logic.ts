/**
 * 배송 처리(이행) 순수 로직 모듈 (t003_배송처리 spec §4, §5)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/app/(admin)/orders/page.tsx 가
 *   canFulfill / canShip / canDeliver / calcUnfulfilledItems /
 *   calcRemainingItems / validateTrackingNumber 를 실제 호출.
 */

import type { OrderDetail, OrderFulfillment, OrderLineItem } from "@/lib/api/orders";

/** 이행 라인/수량 아이템 */
export type FulfillmentItem = {
  id: string;
  quantity: number;
};

/**
 * 출고 처리(fulfill) 가능 여부 판정 (spec §3 S1)
 * - fulfillment_status === "not_fulfilled" 이고 주문이 취소되지 않은 경우 true
 */
export function canFulfill(order: Pick<OrderDetail, "fulfillment_status" | "status">): boolean {
  return order.fulfillment_status === "not_fulfilled" && order.status !== "canceled";
}

/**
 * 송장 등록(ship) 가능 여부 판정 (spec §3 S3)
 * - 활성 fulfillment 가 있고, shipped_at 이 없고, 주문이 취소되지 않은 경우 true
 */
export function canShip(
  fulfillment: OrderFulfillment | null,
  order: Pick<OrderDetail, "status">
): boolean {
  return !!fulfillment && !fulfillment.shipped_at && order.status !== "canceled";
}

/**
 * 배송 완료 처리(deliver) 가능 여부 판정
 * - 활성 fulfillment 가 있고, shipped_at 이 있고, delivered_at 이 없는 경우 true
 */
export function canDeliver(fulfillment: OrderFulfillment | null): boolean {
  return !!fulfillment && !!fulfillment.shipped_at && !fulfillment.delivered_at;
}

/**
 * 미이행(unfulfilled) 라인/수량 산출 순수함수 (spec §4 I1, UT-001)
 *
 * - 이행 완료된 items(shipped/fulfilled 라인)를 제외하고 남은 수량을 반환.
 * - 현재 구현에서는 주문 items 전체를 미이행 대상으로 간주
 *   (Medusa fulfillments.items 연동 확장 포인트 — spec §2 step2).
 *
 * @param items  OrderLineItem 배열
 * @returns FulfillmentItem 배열 (id, quantity)
 */
export function calcUnfulfilledItems(items: OrderLineItem[]): FulfillmentItem[] {
  return items.map((it) => ({ id: it.id, quantity: it.quantity }));
}

/**
 * 부분배송 잔여 수량 산출 순수함수 (spec §3 S2, UT-003)
 *
 * - 전체 주문 수량 합산 - 이행된 수량 합산 = 잔여 수량
 * - 잔여 > 0 이면 부분배송(partially_delivered) 상태
 *
 * @param orderItems  주문 전체 라인아이템
 * @param fulfilledItems  이행된 라인아이템 (fulfillment.items 등)
 * @returns 잔여 수량 합계 (0이면 전량 이행)
 */
export function calcRemainingItems(
  orderItems: { quantity: number }[],
  fulfilledItems: { quantity: number }[]
): number {
  const total = orderItems.reduce((s, i) => s + i.quantity, 0);
  const done = fulfilledItems.reduce((s, i) => s + i.quantity, 0);
  return Math.max(0, total - done);
}

/**
 * 부분배송 여부 판정 (spec §3 S2, UT-003)
 * - fulfillment_status === "partially_fulfilled" 또는 "partially_delivered"
 */
export function isPartiallyDelivered(
  fulfillmentStatus: string
): boolean {
  return (
    fulfillmentStatus === "partially_fulfilled" ||
    fulfillmentStatus === "partially_delivered"
  );
}

/**
 * 송장번호 주문 내 중복 검증 순수함수 (spec §4 I3, UT-002)
 *
 * - 해당 주문의 모든 fulfillment labels 에서 trackingNumber 중복 여부 확인.
 * - 중복이면 true 반환.
 *
 * @param fulfillments  주문의 fulfillments 배열
 * @param trackingNumber  입력된 송장번호
 * @returns 중복이면 true
 */
export function isDuplicateTracking(
  fulfillments: OrderFulfillment[],
  trackingNumber: string
): boolean {
  if (!trackingNumber.trim()) return false;
  const needle = trackingNumber.trim().toLowerCase();
  return fulfillments.some((f) =>
    (f.labels ?? []).some(
      (l) => l.tracking_number?.toLowerCase() === needle
    )
  );
}

/**
 * 송장번호 형식 검증 순수함수 (spec §4 I3)
 * - 1자 이상의 공백 제거 후 비어있지 않아야 함.
 * - 유효하면 true.
 */
export function isValidTrackingNumber(trackingNumber: string): boolean {
  return trackingNumber.trim().length > 0;
}
