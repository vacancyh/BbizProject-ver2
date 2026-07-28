/**
 * 단위 테스트 — t004_반품접수 (unit_006)
 *
 * production 코드 import: @/lib/orders/return-logic (복제 없음)
 * 호출처:
 *  - apps/admin/src/app/(admin)/orders/page.tsx 가
 *    calcReturnableItems / isDuplicateReturnLine / resolveShippingFeePayer /
 *    canRequestReturn / canReceiveReturn 를 실제 호출
 *
 * UT-001: 반품 접수(requested) — calcReturnableItems, resolveShippingFeePayer, canRequestReturn
 * UT-002: 수령 처리(received) — canReceiveReturn
 * UT-003: 동일 라인 중복 차단 409 — isDuplicateReturnLine
 */

import { describe, it, expect } from "vitest";
import {
  calcReturnableItems,
  isDuplicateReturnLine,
  resolveShippingFeePayer,
  canRequestReturn,
  canReceiveReturn,
  type ActiveReturnLine,
} from "../return-logic";
import type { OrderLineItem } from "@/lib/api/orders";

// ─── 공용 픽스처 ─────────────────────────────────────────────────────────────

function makeLineItem(overrides: Partial<OrderLineItem> = {}): OrderLineItem {
  return {
    id: "item_01",
    product_title: "테스트 상품",
    variant_title: null,
    variant_sku: null,
    quantity: 3,
    unit_price: 15000,
    total: 45000,
    thumbnail: null,
    ...overrides,
  };
}

function _makeActiveReturnLine(overrides: Partial<ActiveReturnLine> = {}): ActiveReturnLine {
  return {
    item_id: "item_01",
    quantity: 1,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// UT-001: 반품 접수(requested) (unit_006 #1)
// 검증: calcReturnableItems, resolveShippingFeePayer, canRequestReturn
// 기대: Return 생성 + 사유/배송비부담 기록
// ════════════════════════════════════════════════════════════════════════════

describe("UT-001 반품 접수(requested) (unit_006 #1)", () => {
  describe("calcReturnableItems — 반품 가능 라인/수량 산출", () => {
    it("활성 반품 없으면 전체 수량 = maxQuantity", () => {
      const items = [makeLineItem({ id: "item_01", quantity: 3 })];
      const result = calcReturnableItems(items, []);
      expect(result).toHaveLength(1);
      expect(result[0].maxQuantity).toBe(3);
      expect(result[0].id).toBe("item_01");
    });

    it("이미 반품 진행 중인 수량 차감", () => {
      const items = [makeLineItem({ id: "item_01", quantity: 5 })];
      const active: ActiveReturnLine[] = [{ item_id: "item_01", quantity: 2 }];
      const result = calcReturnableItems(items, active);
      expect(result[0].maxQuantity).toBe(3); // 5 - 2 = 3
    });

    it("전량 반품 진행 중 → 해당 라인 결과에서 제외(maxQuantity=0)", () => {
      const items = [
        makeLineItem({ id: "item_01", quantity: 2 }),
        makeLineItem({ id: "item_02", quantity: 1, product_title: "상품2" }),
      ];
      const active: ActiveReturnLine[] = [{ item_id: "item_01", quantity: 2 }];
      const result = calcReturnableItems(items, active);
      // item_01은 maxQuantity=0 으로 필터링됨
      expect(result.find((r) => r.id === "item_01")).toBeUndefined();
      // item_02는 그대로 반환
      expect(result.find((r) => r.id === "item_02")).toBeDefined();
      expect(result.find((r) => r.id === "item_02")?.maxQuantity).toBe(1);
    });

    it("복수 라인 반품 가능 수량 각각 정확 계산", () => {
      const items = [
        makeLineItem({ id: "item_01", quantity: 4 }),
        makeLineItem({ id: "item_02", quantity: 3, product_title: "상품2" }),
      ];
      const active: ActiveReturnLine[] = [
        { item_id: "item_01", quantity: 1 },
        { item_id: "item_02", quantity: 2 },
      ];
      const result = calcReturnableItems(items, active);
      const r01 = result.find((r) => r.id === "item_01");
      const r02 = result.find((r) => r.id === "item_02");
      expect(r01?.maxQuantity).toBe(3); // 4 - 1
      expect(r02?.maxQuantity).toBe(1); // 3 - 2
    });

    it("빈 라인 목록 → 빈 배열", () => {
      expect(calcReturnableItems([], [])).toHaveLength(0);
    });
  });

  describe("resolveShippingFeePayer — 배송비 부담 자동 판정", () => {
    it("CUSTOMER_CHANGE_OF_MIND → customer (소비자 부담)", () => {
      expect(resolveShippingFeePayer("CUSTOMER_CHANGE_OF_MIND")).toBe("customer");
    });

    it("PRODUCT_DEFECT → seller (사업자 귀책)", () => {
      expect(resolveShippingFeePayer("PRODUCT_DEFECT")).toBe("seller");
    });

    it("WRONG_DELIVERY → seller (사업자 귀책)", () => {
      expect(resolveShippingFeePayer("WRONG_DELIVERY")).toBe("seller");
    });

    it("OTHER → customer (기본 소비자 부담)", () => {
      expect(resolveShippingFeePayer("OTHER")).toBe("customer");
    });
  });

  describe("canRequestReturn — 반품 접수 가능 여부", () => {
    it("delivered + 취소 아님 → true", () => {
      expect(canRequestReturn("delivered", "completed")).toBe(true);
    });

    it("not_fulfilled → false (배송 미완료)", () => {
      expect(canRequestReturn("not_fulfilled", "pending")).toBe(false);
    });

    it("delivered + canceled → false", () => {
      expect(canRequestReturn("delivered", "canceled")).toBe(false);
    });

    it("fulfilled(미배송) → false", () => {
      expect(canRequestReturn("fulfilled", "pending")).toBe(false);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UT-002: 수령 처리(received) (unit_006 #2)
// 검증: canReceiveReturn
// 기대: received 전이 + 검수 대기
// ════════════════════════════════════════════════════════════════════════════

describe("UT-002 수령 처리(received) (unit_006 #2)", () => {
  describe("canReceiveReturn — 반품 수령 처리 가능 여부", () => {
    it("requested 상태 → true (수령 처리 가능)", () => {
      expect(canReceiveReturn("requested")).toBe(true);
    });

    it("partially_received 상태 → true (부분 수령 후 추가 수령)", () => {
      expect(canReceiveReturn("partially_received")).toBe(true);
    });

    it("received 상태 → false (이미 완료)", () => {
      expect(canReceiveReturn("received")).toBe(false);
    });

    it("canceled 상태 → false", () => {
      expect(canReceiveReturn("canceled")).toBe(false);
    });

    it("open 상태(미접수) → false", () => {
      expect(canReceiveReturn("open")).toBe(false);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UT-003: 동일 라인 중복 차단 409 LINE_ALREADY_IN_PROCESS (unit_006 #3)
// 검증: isDuplicateReturnLine
// 기대: 클라이언트 가드 — 409 서버 호출 전 차단
// ════════════════════════════════════════════════════════════════════════════

describe("UT-003 동일 라인 중복 차단(409 LINE_ALREADY_IN_PROCESS) (unit_006 #3)", () => {
  describe("isDuplicateReturnLine — 동일 라인 중복 검증", () => {
    it("요청 항목 중 이미 반품 중인 라인 포함 → true (차단)", () => {
      const active: ActiveReturnLine[] = [
        { item_id: "item_01", quantity: 2 },
      ];
      expect(isDuplicateReturnLine(["item_01"], active)).toBe(true);
    });

    it("요청 항목에 반품 중인 라인 없음 → false (통과)", () => {
      const active: ActiveReturnLine[] = [
        { item_id: "item_01", quantity: 1 },
      ];
      expect(isDuplicateReturnLine(["item_02", "item_03"], active)).toBe(false);
    });

    it("복수 요청 중 일부만 중복 → true (차단)", () => {
      const active: ActiveReturnLine[] = [
        { item_id: "item_02", quantity: 1 },
      ];
      // item_01은 신규, item_02는 중복
      expect(isDuplicateReturnLine(["item_01", "item_02"], active)).toBe(true);
    });

    it("활성 반품 없음 → false (항상 통과)", () => {
      expect(isDuplicateReturnLine(["item_01", "item_02"], [])).toBe(false);
    });

    it("요청 항목 없음 → false", () => {
      const active: ActiveReturnLine[] = [{ item_id: "item_01", quantity: 1 }];
      expect(isDuplicateReturnLine([], active)).toBe(false);
    });

    it("동일 라인 복수 active return 이 있어도 중복 감지", () => {
      const active: ActiveReturnLine[] = [
        { item_id: "item_01", quantity: 1 },
        { item_id: "item_01", quantity: 1 },
      ];
      expect(isDuplicateReturnLine(["item_01"], active)).toBe(true);
    });
  });
});
