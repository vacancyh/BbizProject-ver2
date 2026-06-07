/**
 * 단위 테스트 — t003_배송처리 (unit_005)
 *
 * production 코드 import: @/lib/orders/fulfillment-logic (복제 없음)
 * 호출처:
 *  - apps/admin/src/app/(admin)/orders/page.tsx 가
 *    canFulfill / canShip / canDeliver / calcUnfulfilledItems /
 *    calcRemainingItems / isPartiallyDelivered / isDuplicateTracking /
 *    isValidTrackingNumber 를 실제 호출
 *
 * UT-001: 이행 생성 + 재고 할당 — canFulfill / calcUnfulfilledItems
 * UT-002: 송장 발송 + 상태 전이 — canShip / isDuplicateTracking / isValidTrackingNumber
 * UT-003: 부분배송 — calcRemainingItems / isPartiallyDelivered
 */

import { describe, it, expect } from "vitest";
import {
  canFulfill,
  canShip,
  canDeliver,
  calcUnfulfilledItems,
  calcRemainingItems,
  isPartiallyDelivered,
  isDuplicateTracking,
  isValidTrackingNumber,
  type FulfillmentItem,
} from "../fulfillment-logic";
import type { OrderFulfillment, OrderLineItem } from "@/lib/api/orders";

// ─── 공용 픽스처 ─────────────────────────────────────────────────────────────

function makeOrder(overrides: {
  fulfillment_status?: string;
  status?: string;
} = {}) {
  return {
    fulfillment_status: overrides.fulfillment_status ?? "not_fulfilled",
    status: overrides.status ?? "pending",
  };
}

function makeFulfillment(overrides: Partial<OrderFulfillment> = {}): OrderFulfillment {
  return {
    id: "ful_01",
    packed_at: null,
    shipped_at: null,
    delivered_at: null,
    canceled_at: null,
    labels: [],
    ...overrides,
  };
}

function makeLineItem(overrides: Partial<OrderLineItem> = {}): OrderLineItem {
  return {
    id: "item_01",
    product_title: "테스트 상품",
    variant_title: null,
    variant_sku: null,
    quantity: 2,
    unit_price: 10000,
    total: 20000,
    thumbnail: null,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// UT-001: 이행 생성 + 재고 할당 (unit_005 #1)
// 검증: canFulfill, calcUnfulfilledItems
// ════════════════════════════════════════════════════════════════════════════

describe("UT-001 이행 생성 + 재고 할당 (unit_005 #1)", () => {
  describe("canFulfill — 출고 처리 가능 여부", () => {
    it("not_fulfilled + 취소 아닌 주문 → true", () => {
      expect(canFulfill(makeOrder({ fulfillment_status: "not_fulfilled", status: "pending" }))).toBe(true);
    });

    it("not_fulfilled + canceled → false (미결제 이행 금지)", () => {
      expect(canFulfill(makeOrder({ fulfillment_status: "not_fulfilled", status: "canceled" }))).toBe(false);
    });

    it("fulfilled 상태 → false (이미 이행됨)", () => {
      expect(canFulfill(makeOrder({ fulfillment_status: "fulfilled", status: "pending" }))).toBe(false);
    });

    it("delivered 상태 → false", () => {
      expect(canFulfill(makeOrder({ fulfillment_status: "delivered", status: "completed" }))).toBe(false);
    });
  });

  describe("calcUnfulfilledItems — 미이행 라인 산출", () => {
    it("단일 라인 → { id, quantity } 배열 반환", () => {
      const items = [makeLineItem({ id: "item_01", quantity: 3 })];
      const result = calcUnfulfilledItems(items);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: "item_01", quantity: 3 });
    });

    it("복수 라인 → 전체 라인 FulfillmentItem 배열 반환", () => {
      const items = [
        makeLineItem({ id: "item_01", quantity: 2 }),
        makeLineItem({ id: "item_02", quantity: 5, product_title: "상품2" }),
      ];
      const result = calcUnfulfilledItems(items);
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ id: "item_02", quantity: 5 });
    });

    it("빈 배열 → 빈 배열 반환", () => {
      expect(calcUnfulfilledItems([])).toHaveLength(0);
    });

    it("산출 결과가 FulfillmentItem 형태 (id + quantity 만)", () => {
      const items = [makeLineItem({ id: "item_x", quantity: 1 })];
      const result: FulfillmentItem[] = calcUnfulfilledItems(items);
      const keys = Object.keys(result[0]);
      expect(keys).toContain("id");
      expect(keys).toContain("quantity");
      // product_title 등 불필요한 필드 없음
      expect(keys).not.toContain("product_title");
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UT-002: 송장 발송 + 상태 전이 (unit_005 #2)
// 검증: canShip, isDuplicateTracking, isValidTrackingNumber
// ════════════════════════════════════════════════════════════════════════════

describe("UT-002 송장 발송 + 상태 전이 (unit_005 #2)", () => {
  describe("canShip — 송장 등록 가능 여부", () => {
    it("fulfillment 있고 shipped_at 없고 취소 아님 → true", () => {
      const ful = makeFulfillment({ shipped_at: null });
      expect(canShip(ful, makeOrder({ status: "pending" }))).toBe(true);
    });

    it("fulfillment 없음 → false", () => {
      expect(canShip(null, makeOrder())).toBe(false);
    });

    it("이미 shipped_at 있음 → false", () => {
      const ful = makeFulfillment({ shipped_at: "2024-01-01T00:00:00Z" });
      expect(canShip(ful, makeOrder())).toBe(false);
    });

    it("주문 canceled 상태 → false", () => {
      const ful = makeFulfillment({ shipped_at: null });
      expect(canShip(ful, makeOrder({ status: "canceled" }))).toBe(false);
    });
  });

  describe("isDuplicateTracking — 송장번호 중복 검증", () => {
    it("동일 송장번호 존재 → true (중복 차단)", () => {
      const fulfillments: OrderFulfillment[] = [
        makeFulfillment({ labels: [{ tracking_number: "123456789" }] }),
      ];
      expect(isDuplicateTracking(fulfillments, "123456789")).toBe(true);
    });

    it("다른 송장번호 → false (통과)", () => {
      const fulfillments: OrderFulfillment[] = [
        makeFulfillment({ labels: [{ tracking_number: "111111111" }] }),
      ];
      expect(isDuplicateTracking(fulfillments, "999999999")).toBe(false);
    });

    it("대소문자 무시 비교", () => {
      const fulfillments: OrderFulfillment[] = [
        makeFulfillment({ labels: [{ tracking_number: "ABC-123" }] }),
      ];
      expect(isDuplicateTracking(fulfillments, "abc-123")).toBe(true);
    });

    it("빈 fulfillments → false", () => {
      expect(isDuplicateTracking([], "123456")).toBe(false);
    });

    it("빈 trackingNumber → false (검증 생략)", () => {
      const fulfillments: OrderFulfillment[] = [
        makeFulfillment({ labels: [{ tracking_number: "123" }] }),
      ];
      expect(isDuplicateTracking(fulfillments, "   ")).toBe(false);
    });
  });

  describe("isValidTrackingNumber — 송장번호 형식 검증", () => {
    it("비어있지 않은 문자열 → true", () => {
      expect(isValidTrackingNumber("1234567890")).toBe(true);
    });

    it("공백만 있는 문자열 → false", () => {
      expect(isValidTrackingNumber("   ")).toBe(false);
    });

    it("빈 문자열 → false", () => {
      expect(isValidTrackingNumber("")).toBe(false);
    });
  });

  describe("canDeliver — 배송 완료 처리 가능 여부", () => {
    it("shipped_at 있고 delivered_at 없음 → true", () => {
      const ful = makeFulfillment({ shipped_at: "2024-01-01T00:00:00Z", delivered_at: null });
      expect(canDeliver(ful)).toBe(true);
    });

    it("delivered_at 이미 있음 → false", () => {
      const ful = makeFulfillment({
        shipped_at: "2024-01-01T00:00:00Z",
        delivered_at: "2024-01-03T00:00:00Z",
      });
      expect(canDeliver(ful)).toBe(false);
    });

    it("fulfillment 없음 → false", () => {
      expect(canDeliver(null)).toBe(false);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UT-003: 부분배송 (unit_005 #3)
// 검증: calcRemainingItems, isPartiallyDelivered
// ════════════════════════════════════════════════════════════════════════════

describe("UT-003 부분배송 (unit_005 #3)", () => {
  describe("calcRemainingItems — 잔여 수량 산출", () => {
    it("전량 이행 시 잔여 = 0", () => {
      const orderItems = [{ quantity: 3 }, { quantity: 2 }];
      const fulfilledItems = [{ quantity: 3 }, { quantity: 2 }];
      expect(calcRemainingItems(orderItems, fulfilledItems)).toBe(0);
    });

    it("일부만 이행 시 잔여 > 0 (부분배송)", () => {
      const orderItems = [{ quantity: 5 }, { quantity: 3 }];
      const fulfilledItems = [{ quantity: 3 }];
      // 합계 8 - 이행 3 = 5
      expect(calcRemainingItems(orderItems, fulfilledItems)).toBe(5);
    });

    it("이행 없으면 전체 수량이 잔여", () => {
      const orderItems = [{ quantity: 4 }];
      expect(calcRemainingItems(orderItems, [])).toBe(4);
    });

    it("잔여 음수 되지 않음 (이행 초과 방어)", () => {
      const orderItems = [{ quantity: 2 }];
      const fulfilledItems = [{ quantity: 5 }];
      expect(calcRemainingItems(orderItems, fulfilledItems)).toBe(0);
    });

    it("빈 주문 → 0", () => {
      expect(calcRemainingItems([], [])).toBe(0);
    });
  });

  describe("isPartiallyDelivered — 부분배송 상태 판정", () => {
    it("partially_fulfilled → true", () => {
      expect(isPartiallyDelivered("partially_fulfilled")).toBe(true);
    });

    it("partially_delivered → true", () => {
      expect(isPartiallyDelivered("partially_delivered")).toBe(true);
    });

    it("delivered → false (전량 완료)", () => {
      expect(isPartiallyDelivered("delivered")).toBe(false);
    });

    it("not_fulfilled → false", () => {
      expect(isPartiallyDelivered("not_fulfilled")).toBe(false);
    });

    it("fulfilled → false", () => {
      expect(isPartiallyDelivered("fulfilled")).toBe(false);
    });
  });
});
