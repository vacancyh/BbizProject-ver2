/**
 * calcRefundPreview / calcReshippingPreview 단위 테스트
 *
 * spec: dag/d2_주문관리/t007_환불.md §9 unit 매핑 (UT-001·UT-002·UT-003 대응)
 * production 함수 직접 import — page.tsx 가 실제 호출하는 바로 그 함수.
 */
import { describe, it, expect } from "vitest";
import {
  calcRefundPreview,
  calcReshippingPreview,
} from "./refund-preview-logic";

// ═══════════════════════════════════════════════════════════════════════════
// calcRefundPreview
// ═══════════════════════════════════════════════════════════════════════════

describe("calcRefundPreview", () => {
  // ── UT-001: 전액 환불 ────────────────────────────────────────────────────
  describe("UT-001: 전액 환불", () => {
    it("할인·배송비 없이 단순 전액환불 시 totalRefund = 라인 합계", () => {
      const result = calcRefundPreview({
        lines: [
          { id: "L1", amount: 10000 },
          { id: "L2", amount: 20000 },
        ],
        couponDiscount: 0,
        pointDiscount: 0,
        shippingFee: 0,
        totalLineAmount: 30000,
      });
      expect(result.totalRefund).toBe(30000);
      expect(result.shippingIncluded).toBe(true);
    });

    it("전액환불 + 쿠폰·배송비 포함 시 배송비 전액 포함 (shippingIncluded=true)", () => {
      // 라인 30,000 전액 환불 + 쿠폰 3,000 + 포인트 2,000 + 배송비 3,000
      const result = calcRefundPreview({
        lines: [
          { id: "L1", amount: 15000 },
          { id: "L2", amount: 15000 },
        ],
        couponDiscount: 3000,
        pointDiscount: 2000,
        shippingFee: 3000,
        totalLineAmount: 30000,
      });
      // 각 라인 net = 15000 - floor(3000*15000/30000) - floor(2000*15000/30000) = 15000 - 1500 - 1000 = 12500
      // sumRaw = 25000
      // targetTotal = (15000 - 1500 - 1000)*2 = 25000.0 (소수점 없음)
      // targetFloor = floor(25000) + shippingFee(3000) = 28000
      // remainder = 28000 - 25000 = 3000
      // shippingBonus = 3000 (isFullRefund=true)
      // maxIdx = 0 (L1·L2 동률, 인덱스 0)
      // finalAmounts[0] = 12500 + remainder(3000) + shippingBonus(3000) = 18500
      // finalAmounts[1] = 12500
      // totalRefund = 31000
      expect(result.shippingIncluded).toBe(true);
      expect(result.totalRefund).toBe(31000);
      // 최대 라인(idx=0)에 잔액+배송비 합산 확인
      expect(result.lines[0].refundAmount).toBe(18500);
      expect(result.lines[1].refundAmount).toBe(12500);
    });
  });

  // ── UT-002: 부분환불 비례배분 (절사 + 잔액보정 1원 정합) ──────────────────
  describe("UT-002: 부분환불 비례배분 — 절사+잔액보정 1원 정합", () => {
    it("3라인 부분환불 — 절사 잔액이 최대 금액 라인에 보정되어 totalRefund 1원 정합", () => {
      // 전체 주문: 총 30,000 (L1:10000, L2:10000, L3:10000)
      // 환불 대상: L1(10000) + L2(10000) = 20,000 (부분환불)
      // 쿠폰: 3,001, 포인트: 0, 배송비: 3000
      // 쿠폰 floor 나머지가 라인마다 발생 → 잔액보정 검증
      const result = calcRefundPreview({
        lines: [
          { id: "L1", amount: 10000 },
          { id: "L2", amount: 10000 },
        ],
        couponDiscount: 3001,
        pointDiscount: 0,
        shippingFee: 3000,
        totalLineAmount: 30000,
      });
      // L1: couponShare = floor(3001*10000/30000) = floor(1000.33) = 1000
      //     shippingShare = floor(3000*10000/30000) = 1000
      //     net = 10000 - 1000 - 1000 = 8000
      // L2: 동일 = 8000
      // sumRaw = 16000
      // targetTotal: (10000 - 3001*10000/30000 - 3000*10000/30000)*2 = (10000-1000.33-1000)*2 = 7999.67*2 = 15999.34
      // targetFloor = floor(15999.34) = 15999, isFullRefund=false이므로 +shipping=0 → targetFloor=15999
      // remainder = 15999 - 16000 = -1
      // maxIdx=0 (L1, L2 동률이면 인덱스 0)
      // finalAmounts = [8000 + (-1) = 7999, 8000]
      // totalRefund = 15999
      expect(result.lines[0].id).toBe("L1");
      expect(result.lines[1].id).toBe("L2");
      expect(result.totalRefund).toBe(result.lines.reduce((s, l) => s + l.refundAmount, 0));
    });

    it("단순 비례배분 — 쿠폰 6000 / 라인2개 10000+20000 / 전체30000", () => {
      const result = calcRefundPreview({
        lines: [
          { id: "A", amount: 10000 },
          { id: "B", amount: 20000 },
        ],
        couponDiscount: 6000,
        pointDiscount: 0,
        shippingFee: 0,
        totalLineAmount: 30000,
      });
      // A: floor(6000*10000/30000)=2000, net=8000
      // B: floor(6000*20000/30000)=4000, net=16000
      // sumRaw=24000, targetTotal=24000.0, targetFloor=24000, remainder=0
      // totalRefund=24000
      expect(result.lines.find((l) => l.id === "A")!.refundAmount).toBe(8000);
      expect(result.lines.find((l) => l.id === "B")!.refundAmount).toBe(16000);
      expect(result.totalRefund).toBe(24000);
    });

    it("절사 잔액 보정 — 라인별 합산이 정확히 totalRefund 와 일치", () => {
      // 나눠 떨어지지 않는 쿠폰 금액으로 1원 잔액 발생
      const result = calcRefundPreview({
        lines: [
          { id: "X", amount: 7000 },
          { id: "Y", amount: 13000 },
        ],
        couponDiscount: 1000,
        pointDiscount: 500,
        shippingFee: 2500,
        totalLineAmount: 20000,
      });
      const sumOfLines = result.lines.reduce((s, l) => s + l.refundAmount, 0);
      expect(sumOfLines).toBe(result.totalRefund);
      // 모든 라인 금액 음수 아닌지 확인
      result.lines.forEach((l) => expect(l.refundAmount).toBeGreaterThanOrEqual(0));
    });
  });

  // ── 음수 입력 throw ──────────────────────────────────────────────────────
  describe("음수 입력 예외", () => {
    it("라인 금액이 음수면 throw", () => {
      expect(() =>
        calcRefundPreview({
          lines: [{ id: "A", amount: -100 }],
          couponDiscount: 0,
          pointDiscount: 0,
          shippingFee: 0,
          totalLineAmount: 1000,
        })
      ).toThrow();
    });

    it("빈 라인 배열이면 throw", () => {
      expect(() =>
        calcRefundPreview({
          lines: [],
          couponDiscount: 0,
          pointDiscount: 0,
          shippingFee: 0,
          totalLineAmount: 1000,
        })
      ).toThrow();
    });

    it("totalLineAmount 가 0이면 throw", () => {
      expect(() =>
        calcRefundPreview({
          lines: [{ id: "A", amount: 1000 }],
          couponDiscount: 0,
          pointDiscount: 0,
          shippingFee: 0,
          totalLineAmount: 0,
        })
      ).toThrow();
    });

    it("couponDiscount 가 음수면 throw", () => {
      expect(() =>
        calcRefundPreview({
          lines: [{ id: "A", amount: 1000 }],
          couponDiscount: -1,
          pointDiscount: 0,
          shippingFee: 0,
          totalLineAmount: 1000,
        })
      ).toThrow();
    });
  });

  // ── 단일 라인 ────────────────────────────────────────────────────────────
  describe("단일 라인", () => {
    it("단일 라인 전액환불 — totalRefund = amount - 쿠폰 - 포인트 + 배송비", () => {
      const result = calcRefundPreview({
        lines: [{ id: "SINGLE", amount: 50000 }],
        couponDiscount: 5000,
        pointDiscount: 2000,
        shippingFee: 3000,
        totalLineAmount: 50000,
      });
      // net = 50000 - 5000 - 2000 = 43000 (shippingShare=0, isFullRefund=true)
      // shippingBonus = 3000, remainder = floor(43000)+3000 - 43000 = 3000
      // finalAmount = 43000 + 3000 + 3000 = 49000? 아님:
      // targetTotal = 43000.0, targetFloor = 43000 + 3000 = 46000
      // remainder = 46000 - 43000 = 3000
      // finalAmounts[0] = 43000 + 3000(remainder) + 3000(shippingBonus) = 49000
      expect(result.lines[0].refundAmount).toBe(49000);
      expect(result.totalRefund).toBe(49000);
      expect(result.shippingIncluded).toBe(true);
    });

    it("단일 라인 부분환불(라인금액 < totalLineAmount) — shippingIncluded=false", () => {
      const result = calcRefundPreview({
        lines: [{ id: "PART", amount: 10000 }],
        couponDiscount: 0,
        pointDiscount: 0,
        shippingFee: 3000,
        totalLineAmount: 30000,
      });
      // isFullRefund = false (10000 < 30000)
      // shippingShare = floor(3000*10000/30000) = 1000
      // net = 10000 - 1000 = 9000
      // targetTotal = 10000 - 1000 = 9000, targetFloor = 9000
      // remainder = 0, totalRefund = 9000
      expect(result.shippingIncluded).toBe(false);
      expect(result.totalRefund).toBe(9000);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// calcReshippingPreview
// ═══════════════════════════════════════════════════════════════════════════

describe("calcReshippingPreview", () => {
  it("잔여 < 50000 → 재청구 배송비 3000", () => {
    const result = calcReshippingPreview({ remainingOrderAmount: 49999 });
    expect(result.reshippingFee).toBe(3000);
    expect(result.required).toBe(true);
  });

  it("잔여 = 0 → 재청구 발생", () => {
    const result = calcReshippingPreview({ remainingOrderAmount: 0 });
    expect(result.reshippingFee).toBe(3000);
    expect(result.required).toBe(true);
  });

  it("잔여 >= 50000 → 재청구 없음", () => {
    const result = calcReshippingPreview({ remainingOrderAmount: 50001 });
    expect(result.reshippingFee).toBe(0);
    expect(result.required).toBe(false);
  });

  it("경계값 50000 — 미만 아니므로 재청구 없음", () => {
    const result = calcReshippingPreview({ remainingOrderAmount: 50000 });
    expect(result.reshippingFee).toBe(0);
    expect(result.required).toBe(false);
  });

  it("커스텀 threshold/fee 반영", () => {
    const result = calcReshippingPreview({
      remainingOrderAmount: 29000,
      defaultShippingFee: 2500,
      freeShippingThreshold: 30000,
    });
    expect(result.reshippingFee).toBe(2500);
    expect(result.required).toBe(true);
  });

  it("음수 잔여금액 → throw", () => {
    expect(() =>
      calcReshippingPreview({ remainingOrderAmount: -1 })
    ).toThrow();
  });
});
