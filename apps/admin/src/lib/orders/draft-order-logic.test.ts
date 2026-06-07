/**
 * draft-order-logic 단위 테스트
 *
 * spec: dag/d2_주문관리/t009_수기주문생성.md §9 unit 매핑
 *  - UT-001: draft 주문 생성 (validateDraftOrderInput / calcDraftOrderTotal)
 *  - UT-002: 주문 전환(결제) (canConvertDraftOrder)
 * production 함수 직접 import — page.tsx 가 실제 호출하는 바로 그 함수.
 */
import { describe, it, expect } from "vitest";
import {
  validateDraftOrderInput,
  calcDraftOrderTotal,
  canConvertDraftOrder,
  type DraftOrderInput,
} from "./draft-order-logic";

// 정상 입력 베이스(개별 테스트에서 일부만 깨뜨려 검증)
function baseInput(): DraftOrderInput {
  return {
    email: "buyer@example.com",
    region_id: "reg_01",
    items: [{ variant_id: "var_01", quantity: 2, unit_price: 10000 }],
    shipping_address: {
      first_name: "홍길동",
      address_1: "서울시 강남구 테헤란로 1",
      city: "서울",
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UT-001: draft 주문 생성 (입력 검증 + 금액 계산)
// ═══════════════════════════════════════════════════════════════════════════

describe("UT-001: draft 주문 생성 (validateDraftOrderInput)", () => {
  it("정상 입력 → valid", () => {
    expect(validateDraftOrderInput(baseInput()).valid).toBe(true);
  });

  it("이메일 누락 → invalid", () => {
    const r = validateDraftOrderInput({ ...baseInput(), email: "" });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("고객");
  });

  it("이메일 형식 오류 → invalid", () => {
    const r = validateDraftOrderInput({ ...baseInput(), email: "bad-email" });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("이메일");
  });

  it("리전 누락 → invalid", () => {
    const r = validateDraftOrderInput({ ...baseInput(), region_id: "" });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("리전");
  });

  it("상품 라인 없음 → invalid", () => {
    const r = validateDraftOrderInput({ ...baseInput(), items: [] });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("상품");
  });

  it("수량 0 → invalid", () => {
    const r = validateDraftOrderInput({
      ...baseInput(),
      items: [{ variant_id: "var_01", quantity: 0, unit_price: 10000 }],
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("수량");
  });

  it("variant 미선택 → invalid", () => {
    const r = validateDraftOrderInput({
      ...baseInput(),
      items: [{ variant_id: "", quantity: 1, unit_price: 10000 }],
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("상품");
  });

  it("배송지 누락 → invalid", () => {
    const r = validateDraftOrderInput({ ...baseInput(), shipping_address: null });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("배송지");
  });

  it("수취인명 누락 → invalid", () => {
    const r = validateDraftOrderInput({
      ...baseInput(),
      shipping_address: { address_1: "서울시 강남구", city: "서울" },
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("수취인");
  });

  it("주소1 누락 → invalid", () => {
    const r = validateDraftOrderInput({
      ...baseInput(),
      shipping_address: { first_name: "홍길동", city: "서울" },
    });
    expect(r.valid).toBe(false);
    expect(r.reason).toContain("주소");
  });
});

describe("UT-001: 금액 계산 (calcDraftOrderTotal)", () => {
  it("단일 라인 합계", () => {
    expect(
      calcDraftOrderTotal([{ variant_id: "v1", quantity: 2, unit_price: 10000 }])
    ).toBe(20000);
  });

  it("다중 라인 합계", () => {
    expect(
      calcDraftOrderTotal([
        { variant_id: "v1", quantity: 2, unit_price: 10000 }, // 20000
        { variant_id: "v2", quantity: 3, unit_price: 5000 }, // 15000
      ])
    ).toBe(35000);
  });

  it("빈 라인 → throw", () => {
    expect(() => calcDraftOrderTotal([])).toThrow();
  });

  it("음수 수량 → throw", () => {
    expect(() =>
      calcDraftOrderTotal([{ variant_id: "v1", quantity: -1, unit_price: 10000 }])
    ).toThrow();
  });

  it("음수 단가 → throw", () => {
    expect(() =>
      calcDraftOrderTotal([{ variant_id: "v1", quantity: 1, unit_price: -1 }])
    ).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// UT-002: 주문 전환 (canConvertDraftOrder)
// ═══════════════════════════════════════════════════════════════════════════

describe("UT-002: 주문 전환 가능 판정 (canConvertDraftOrder)", () => {
  it("draft + 라인≥1 → 전환 가능", () => {
    expect(canConvertDraftOrder({ is_draft_order: true, itemCount: 1 })).toBe(true);
  });

  it("draft + 라인 0 → 전환 불가", () => {
    expect(canConvertDraftOrder({ is_draft_order: true, itemCount: 0 })).toBe(false);
  });

  it("이미 정식 주문(is_draft_order=false) → 전환 불가", () => {
    expect(canConvertDraftOrder({ is_draft_order: false, itemCount: 3 })).toBe(false);
  });
});
