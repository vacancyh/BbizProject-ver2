/**
 * 단위 테스트 — t005_교환 (unit_007)
 *
 * production 코드 import: @/lib/orders/exchange-logic (복제 없음)
 * 호출처:
 *  - apps/admin/src/app/(admin)/orders/page.tsx 가
 *    calcExchangePreviewDiff / canRequestExchange / isValidExchangeAdditionalItem 을 실제 호출
 *
 * UT-001: 단건 교환 생성 — canRequestExchange, isValidExchangeAdditionalItem
 * UT-002: 다건 그룹 + 1회 회수 — calcExchangePreviewDiff 다건 합산
 * UT-003: 차액 추가결제/환불 — calcExchangePreviewDiff 절사+잔액보정 정합
 */

import { describe, it, expect } from "vitest";
import {
  calcExchangePreviewDiff,
  canRequestExchange,
  isValidExchangeAdditionalItem,
  type ExchangeReturnLine,
  type ExchangeAdditionalLine,
} from "../exchange-logic";

// ─── 공용 픽스처 ─────────────────────────────────────────────────────────────

function makeReturnLine(overrides: Partial<ExchangeReturnLine> = {}): ExchangeReturnLine {
  return {
    id: "item_01",
    quantity: 1,
    unit_price: 20000,
    ...overrides,
  };
}

function makeAdditionalLine(overrides: Partial<ExchangeAdditionalLine> = {}): ExchangeAdditionalLine {
  return {
    variant_id: "var_01",
    quantity: 1,
    unit_price: 25000,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// UT-001: 단건 교환 생성 (unit_007 #1)
// 검증: canRequestExchange, isValidExchangeAdditionalItem
// 기대: Exchange 생성 + 회수 운송장 (진입 조건 + 유효성 검증)
// ════════════════════════════════════════════════════════════════════════════

describe("UT-001 단건 교환 생성 (unit_007 #1)", () => {
  describe("canRequestExchange — 교환 접수 가능 여부", () => {
    it("delivered + 취소 아님 → true (교환 가능 상태)", () => {
      expect(canRequestExchange("delivered", "completed")).toBe(true);
    });

    it("not_fulfilled → false (배송 미완료)", () => {
      expect(canRequestExchange("not_fulfilled", "pending")).toBe(false);
    });

    it("delivered + canceled → false (취소된 주문)", () => {
      expect(canRequestExchange("delivered", "canceled")).toBe(false);
    });

    it("fulfilled(발송 중) → false", () => {
      expect(canRequestExchange("fulfilled", "pending")).toBe(false);
    });

    it("shipped → false (아직 배송 미완료)", () => {
      expect(canRequestExchange("shipped", "pending")).toBe(false);
    });
  });

  describe("isValidExchangeAdditionalItem — 신규 변형 입력 유효성", () => {
    it("정상 입력 → true", () => {
      expect(
        isValidExchangeAdditionalItem({ variant_id: "var_01", quantity: 1, unit_price: 25000 })
      ).toBe(true);
    });

    it("variant_id 빈 문자열 → false", () => {
      expect(
        isValidExchangeAdditionalItem({ variant_id: "", quantity: 1, unit_price: 25000 })
      ).toBe(false);
    });

    it("quantity = 0 → false (최소 1이어야 함)", () => {
      expect(
        isValidExchangeAdditionalItem({ variant_id: "var_01", quantity: 0, unit_price: 25000 })
      ).toBe(false);
    });

    it("unit_price = 0 → true (무료 교환 허용)", () => {
      expect(
        isValidExchangeAdditionalItem({ variant_id: "var_01", quantity: 1, unit_price: 0 })
      ).toBe(true);
    });

    it("unit_price 음수 → false", () => {
      expect(
        isValidExchangeAdditionalItem({ variant_id: "var_01", quantity: 1, unit_price: -1 })
      ).toBe(false);
    });

    it("quantity 복수(>1) → true", () => {
      expect(
        isValidExchangeAdditionalItem({ variant_id: "var_01", quantity: 3, unit_price: 25000 })
      ).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UT-002: 다건 그룹 + 1회 회수 (unit_007 #2)
// 검증: calcExchangePreviewDiff 다건 합산
// 기대: exchange_group 묶음 + 단일 회수 송장 → 차액 합산 정확성
// ════════════════════════════════════════════════════════════════════════════

describe("UT-002 다건 그룹 + 1회 회수 (unit_007 #2)", () => {
  describe("calcExchangePreviewDiff — 다건 합산 차액", () => {
    it("회수 라인 2개 + 신규 라인 2개 → 합산 차액 정확 계산", () => {
      // 회수: item_01(20000*1) + item_02(30000*2) = 80000
      // 신규: var_01(25000*1) + var_02(35000*2) = 95000
      // diff = 95000 - 80000 = 15000
      const returnLines: ExchangeReturnLine[] = [
        makeReturnLine({ id: "item_01", unit_price: 20000, quantity: 1 }),
        makeReturnLine({ id: "item_02", unit_price: 30000, quantity: 2 }),
      ];
      const additionalLines: ExchangeAdditionalLine[] = [
        makeAdditionalLine({ variant_id: "var_01", unit_price: 25000, quantity: 1 }),
        makeAdditionalLine({ variant_id: "var_02", unit_price: 35000, quantity: 2 }),
      ];
      const result = calcExchangePreviewDiff(returnLines, additionalLines);
      expect(result.refund_total).toBe(80000);
      expect(result.additional_total).toBe(95000);
      expect(result.diff).toBe(15000); // 양수 = 추가결제
    });

    it("3건 묶기 시 회수액/신규액 각각 정확 합산", () => {
      // 회수: 10000*2 + 20000*1 + 15000*3 = 85000
      // 신규: 12000*2 + 18000*1 + 20000*3 = 102000
      // diff = 102000 - 85000 = 17000
      const returnLines: ExchangeReturnLine[] = [
        makeReturnLine({ id: "i1", unit_price: 10000, quantity: 2 }),
        makeReturnLine({ id: "i2", unit_price: 20000, quantity: 1 }),
        makeReturnLine({ id: "i3", unit_price: 15000, quantity: 3 }),
      ];
      const additionalLines: ExchangeAdditionalLine[] = [
        makeAdditionalLine({ variant_id: "v1", unit_price: 12000, quantity: 2 }),
        makeAdditionalLine({ variant_id: "v2", unit_price: 18000, quantity: 1 }),
        makeAdditionalLine({ variant_id: "v3", unit_price: 20000, quantity: 3 }),
      ];
      const result = calcExchangePreviewDiff(returnLines, additionalLines);
      expect(result.refund_total).toBe(85000);
      expect(result.additional_total).toBe(102000);
      expect(result.diff).toBe(17000);
    });

    it("회수/신규 동일 금액 → diff = 0 (등가 교환)", () => {
      const returnLines: ExchangeReturnLine[] = [
        makeReturnLine({ id: "i1", unit_price: 25000, quantity: 2 }),
      ];
      const additionalLines: ExchangeAdditionalLine[] = [
        makeAdditionalLine({ variant_id: "v1", unit_price: 25000, quantity: 2 }),
      ];
      const result = calcExchangePreviewDiff(returnLines, additionalLines);
      expect(result.diff).toBe(0);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// UT-003: 차액 추가결제/환불 (unit_007 #3)
// 검증: calcExchangePreviewDiff 절사+잔액보정 정합
// 기대: 차액 부호별 결제/환불 처리 + 백엔드 절사 정합
// ════════════════════════════════════════════════════════════════════════════

describe("UT-003 차액 추가결제/환불 (unit_007 #3)", () => {
  describe("calcExchangePreviewDiff — 절사+잔액보정 정합", () => {
    it("diff > 0 → 추가결제 (신규가 비싸면 고객이 추가 결제)", () => {
      // 회수: 20000*1 = 20000, 신규: 25000*1 = 25000, diff = +5000
      const result = calcExchangePreviewDiff(
        [makeReturnLine({ unit_price: 20000, quantity: 1 })],
        [makeAdditionalLine({ unit_price: 25000, quantity: 1 })]
      );
      expect(result.diff).toBeGreaterThan(0);
      expect(result.diff).toBe(5000);
    });

    it("diff < 0 → 환불 (회수가 비싸면 고객 환불)", () => {
      // 회수: 30000*1 = 30000, 신규: 20000*1 = 20000, diff = -10000
      const result = calcExchangePreviewDiff(
        [makeReturnLine({ unit_price: 30000, quantity: 1 })],
        [makeAdditionalLine({ unit_price: 20000, quantity: 1 })]
      );
      expect(result.diff).toBeLessThan(0);
      expect(result.diff).toBe(-10000);
    });

    it("절사(floor) 적용 — raw 소수점 발생 시 내림 처리", () => {
      // unit_price 가 정수이면 보통 소수 안 나오지만,
      // 수량 배분 시 끝전이 나오는 케이스 시뮬레이션:
      // 회수: 10000 * 3 = 30000 / 추가: 10001 * 3 = 30003
      // diff raw = 3, floor = 3, remainder = 0
      const result = calcExchangePreviewDiff(
        [makeReturnLine({ unit_price: 10000, quantity: 3 })],
        [makeAdditionalLine({ unit_price: 10001, quantity: 3 })]
      );
      expect(result.diff).toBe(3);
      expect(result.remainder).toBe(0);
    });

    it("절사(floor) — 소수 단가 케이스(끝전 절사+잔액보정)", () => {
      // unit_price 소수 허용 시: 회수 10000.7*1=10000.7, 신규 20001.3*1=20001.3
      // raw diff = 10000.6, floor = 10000, remainder ≈ 0.6
      const result = calcExchangePreviewDiff(
        [makeReturnLine({ unit_price: 10000.7, quantity: 1 })],
        [makeAdditionalLine({ unit_price: 20001.3, quantity: 1 })]
      );
      expect(result.diff).toBe(10000); // floor(10000.6) = 10000
      expect(result.remainder).toBeCloseTo(0.6, 5); // 잔액보정
    });

    it("빈 라인 배열 → diff = 0, 모두 0", () => {
      const result = calcExchangePreviewDiff([], []);
      expect(result.diff).toBe(0);
      expect(result.refund_total).toBe(0);
      expect(result.additional_total).toBe(0);
      expect(result.remainder).toBe(0);
    });

    it("회수만 있고 신규 없음 → diff < 0 (전액 환불)", () => {
      const result = calcExchangePreviewDiff(
        [makeReturnLine({ unit_price: 50000, quantity: 1 })],
        []
      );
      expect(result.diff).toBe(-50000);
      expect(result.refund_total).toBe(50000);
      expect(result.additional_total).toBe(0);
    });

    it("신규만 있고 회수 없음 → diff > 0 (전액 추가결제)", () => {
      const result = calcExchangePreviewDiff(
        [],
        [makeAdditionalLine({ unit_price: 50000, quantity: 1 })]
      );
      expect(result.diff).toBe(50000);
    });
  });
});
