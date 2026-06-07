/**
 * order-edit-logic 단위 테스트
 *
 * spec: dag/d2_주문관리/t008_주문수정.md §9 unit 매핑
 *  - UT-001: 라인 수정 + version 증가 (buildItemQuantityChanges / calcOrderEditDiff)
 *  - UT-002: 배송지/이메일 수정 (validateOrderEditEmail / validateShippingAddressInput)
 *  - UT-003: 발송 후 수정 차단 (canEditOrder)
 * production 함수 직접 import — page.tsx 가 실제 호출하는 바로 그 함수.
 */
import { describe, it, expect } from "vitest";
import {
  canEditOrder,
  validateOrderEditEmail,
  validateShippingAddressInput,
  buildItemQuantityChanges,
  calcOrderEditDiff,
} from "./order-edit-logic";

// ═══════════════════════════════════════════════════════════════════════════
// UT-001: 라인 수정 + version 증가 (변경 추출 + 차액 미리보기)
// ═══════════════════════════════════════════════════════════════════════════

describe("UT-001: 라인 수정 (buildItemQuantityChanges / calcOrderEditDiff)", () => {
  describe("buildItemQuantityChanges — 변경된 라인만 추출", () => {
    it("수량 변경된 라인만 payload 로 반환(동일 라인 제외)", () => {
      const changes = buildItemQuantityChanges([
        { id: "L1", currentQuantity: 2, nextQuantity: 3, unitPrice: 10000 }, // 변경
        { id: "L2", currentQuantity: 1, nextQuantity: 1, unitPrice: 20000 }, // 동일
        { id: "L3", currentQuantity: 2, nextQuantity: 0, unitPrice: 5000 }, // 삭제
      ]);
      expect(changes).toEqual([
        { id: "L1", quantity: 3 },
        { id: "L3", quantity: 0 },
      ]);
    });

    it("변경 라인이 없으면 빈 배열", () => {
      const changes = buildItemQuantityChanges([
        { id: "L1", currentQuantity: 2, nextQuantity: 2, unitPrice: 10000 },
      ]);
      expect(changes).toEqual([]);
    });

    it("빈 입력이면 빈 배열", () => {
      expect(buildItemQuantityChanges([])).toEqual([]);
    });

    it("음수 수량이면 throw", () => {
      expect(() =>
        buildItemQuantityChanges([
          { id: "L1", currentQuantity: 1, nextQuantity: -1, unitPrice: 10000 },
        ])
      ).toThrow();
    });
  });

  describe("calcOrderEditDiff — 차액 미리보기(추가결제/환불)", () => {
    it("수량 증가 → 추가결제(diff 양수)", () => {
      // L1 2→3 (+1*10000), L2 1→2 (+1*20000) = +30000
      const result = calcOrderEditDiff([
        { id: "L1", currentQuantity: 2, nextQuantity: 3, unitPrice: 10000 },
        { id: "L2", currentQuantity: 1, nextQuantity: 2, unitPrice: 20000 },
      ]);
      expect(result.diff).toBe(30000);
      expect(result.additionalPayment).toBe(30000);
      expect(result.refundAmount).toBe(0);
      expect(result.changedLineCount).toBe(2);
    });

    it("수량 감소 → 환불(diff 음수, refundAmount 양수 표기)", () => {
      // L1 3→1 (-2*10000) = -20000
      const result = calcOrderEditDiff([
        { id: "L1", currentQuantity: 3, nextQuantity: 1, unitPrice: 10000 },
      ]);
      expect(result.diff).toBe(-20000);
      expect(result.additionalPayment).toBe(0);
      expect(result.refundAmount).toBe(20000);
      expect(result.changedLineCount).toBe(1);
    });

    it("증감 상쇄 → diff 0", () => {
      // L1 +1*10000, L2 -1*10000 = 0 (단, 둘 다 변경되었으므로 changedLineCount=2)
      const result = calcOrderEditDiff([
        { id: "L1", currentQuantity: 1, nextQuantity: 2, unitPrice: 10000 },
        { id: "L2", currentQuantity: 2, nextQuantity: 1, unitPrice: 10000 },
      ]);
      expect(result.diff).toBe(0);
      expect(result.additionalPayment).toBe(0);
      expect(result.refundAmount).toBe(0);
      expect(result.changedLineCount).toBe(2);
    });

    it("변경 없으면 모두 0", () => {
      const result = calcOrderEditDiff([
        { id: "L1", currentQuantity: 2, nextQuantity: 2, unitPrice: 10000 },
      ]);
      expect(result.diff).toBe(0);
      expect(result.changedLineCount).toBe(0);
    });

    it("단가 음수면 throw", () => {
      expect(() =>
        calcOrderEditDiff([
          { id: "L1", currentQuantity: 1, nextQuantity: 2, unitPrice: -1 },
        ])
      ).toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UT-002: 배송지/이메일 수정 검증
// ═══════════════════════════════════════════════════════════════════════════

describe("UT-002: 이메일/배송지 수정 검증", () => {
  describe("validateOrderEditEmail", () => {
    it("정상 이메일 → valid", () => {
      expect(validateOrderEditEmail("user@example.com").valid).toBe(true);
    });

    it("빈 값/null → valid(선택 입력, 수정 안 함)", () => {
      expect(validateOrderEditEmail("").valid).toBe(true);
      expect(validateOrderEditEmail(null).valid).toBe(true);
      expect(validateOrderEditEmail(undefined).valid).toBe(true);
    });

    it("형식 오류 → invalid + 사유", () => {
      const r = validateOrderEditEmail("not-an-email");
      expect(r.valid).toBe(false);
      expect(r.reason).toBeTruthy();
    });

    it("@ 없으면 invalid", () => {
      expect(validateOrderEditEmail("userexample.com").valid).toBe(false);
    });
  });

  describe("validateShippingAddressInput", () => {
    it("필수 필드 모두 채워지면 valid", () => {
      const r = validateShippingAddressInput({
        first_name: "홍",
        last_name: "길동",
        address_1: "서울시 강남구 테헤란로 1",
        city: "서울",
        postal_code: "06222",
      });
      expect(r.valid).toBe(true);
    });

    it("null/전체 빈값 → valid(수정 안 함)", () => {
      expect(validateShippingAddressInput(null).valid).toBe(true);
      expect(
        validateShippingAddressInput({ first_name: "", address_1: "", city: "" }).valid
      ).toBe(true);
    });

    it("주소 입력했으나 수취인명 없으면 invalid", () => {
      const r = validateShippingAddressInput({
        address_1: "서울시 강남구",
        city: "서울",
      });
      expect(r.valid).toBe(false);
      expect(r.reason).toContain("수취인");
    });

    it("이름만 있고 주소1 없으면 invalid", () => {
      const r = validateShippingAddressInput({ first_name: "홍", city: "서울" });
      expect(r.valid).toBe(false);
      expect(r.reason).toContain("주소");
    });

    it("주소1 있으나 도시 없으면 invalid", () => {
      const r = validateShippingAddressInput({
        first_name: "홍",
        address_1: "서울시 강남구",
      });
      expect(r.valid).toBe(false);
      expect(r.reason).toContain("도시");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UT-003: 발송 후 수정 차단 (canEditOrder)
// ═══════════════════════════════════════════════════════════════════════════

describe("UT-003: 발송 후 수정 차단 (canEditOrder)", () => {
  it("발송 전(not_fulfilled, pending) → 수정 가능", () => {
    expect(
      canEditOrder({ status: "pending", fulfillment_status: "not_fulfilled" })
    ).toBe(true);
  });

  it("부분출고(partially_fulfilled) → 수정 가능", () => {
    expect(
      canEditOrder({ status: "pending", fulfillment_status: "partially_fulfilled" })
    ).toBe(true);
  });

  it("발송 후(shipped) → 수정 차단", () => {
    expect(
      canEditOrder({ status: "pending", fulfillment_status: "shipped" })
    ).toBe(false);
  });

  it("출고 완료(fulfilled) → 수정 차단", () => {
    expect(
      canEditOrder({ status: "pending", fulfillment_status: "fulfilled" })
    ).toBe(false);
  });

  it("배송 완료(delivered) → 수정 차단", () => {
    expect(
      canEditOrder({ status: "completed", fulfillment_status: "delivered" })
    ).toBe(false);
  });

  it("취소된 주문 → 수정 차단", () => {
    expect(
      canEditOrder({ status: "canceled", fulfillment_status: "not_fulfilled" })
    ).toBe(false);
  });

  it("완료된 주문 → 수정 차단", () => {
    expect(
      canEditOrder({ status: "completed", fulfillment_status: "not_fulfilled" })
    ).toBe(false);
  });
});
