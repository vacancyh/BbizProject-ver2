/**
 * inventory-adjust-logic 단위 테스트 (d3 t006_재고관리)
 *
 * spec: dag/d3_상품관리/t006_재고관리.md §9 / unit_test/unit_019_재고관리.md
 *  - UT-001: 재고 증감 조정 → 가용/예약 반영
 *  - UT-002: 원자 차감 + 음수 방지 → 음수/예약초과 거부(409 상당)
 *  - UT-003: 대량 조정 충돌 처리 → 부분 실패 리포트
 * production 함수 직접 import — page.tsx 재고 조정 핸들러 정합 함수.
 */
import { describe, it, expect } from "vitest";
import {
  computeAvailable,
  computeAdjustedQty,
  validateAbsoluteStock,
  buildBulkAdjustReport,
  type InventoryLevelSnapshot,
} from "./inventory-adjust-logic";

function level(stocked: number, reserved = 0): InventoryLevelSnapshot {
  return {
    inventory_item_id: "iitem_1",
    location_id: "sloc_1",
    stocked_quantity: stocked,
    reserved_quantity: reserved,
  };
}

describe("computeAvailable", () => {
  it("가용 = 재고 - 예약", () => {
    expect(computeAvailable(10, 3)).toBe(7);
    expect(computeAvailable(5, 5)).toBe(0);
  });
});

describe("computeAdjustedQty (UT-001 증감)", () => {
  it("입고(+) 반영", () => {
    const r = computeAdjustedQty(level(10, 2), 5);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nextStocked).toBe(15);
      expect(r.nextAvailable).toBe(13);
    }
  });

  it("출고(-) 반영", () => {
    const r = computeAdjustedQty(level(10, 2), -3);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nextStocked).toBe(7);
      expect(r.nextAvailable).toBe(5);
    }
  });
});

describe("computeAdjustedQty (UT-002 음수/예약 방지)", () => {
  it("재고 음수화 차감 거부 — NEGATIVE_STOCK", () => {
    const r = computeAdjustedQty(level(3, 0), -5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NEGATIVE_STOCK");
  });

  it("예약수량 미만으로 차감 거부 — BELOW_RESERVED", () => {
    // 재고 10, 예약 8 → 3 까지만 남길 수 있음. -3 차감 시 7(>=8? no) → 7<8 거부
    const r = computeAdjustedQty(level(10, 8), -3);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("BELOW_RESERVED");
  });

  it("예약수량 정확히 남기는 차감은 허용", () => {
    const r = computeAdjustedQty(level(10, 8), -2);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nextStocked).toBe(8);
      expect(r.nextAvailable).toBe(0);
    }
  });

  it("정수 아닌 delta 거부 — INVALID_DELTA", () => {
    const r = computeAdjustedQty(level(10, 0), 1.5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("INVALID_DELTA");
  });

  it("0 차감은 그대로 유지(허용)", () => {
    const r = computeAdjustedQty(level(10, 2), 0);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nextStocked).toBe(10);
  });
});

describe("validateAbsoluteStock (절대수량 set)", () => {
  it("예약 이상으로 설정 허용", () => {
    const r = validateAbsoluteStock(level(10, 3), 5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nextStocked).toBe(5);
  });

  it("예약 미만 설정 거부", () => {
    const r = validateAbsoluteStock(level(10, 5), 3);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("BELOW_RESERVED");
  });

  it("음수 설정 거부", () => {
    const r = validateAbsoluteStock(level(10, 0), -1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NEGATIVE_STOCK");
  });
});

describe("buildBulkAdjustReport (UT-003 부분 실패)", () => {
  it("적용 가능 행/거부 행 분리 + 리포트", () => {
    const report = buildBulkAdjustReport([
      { level: { ...level(10, 0), inventory_item_id: "a", location_id: "L1" }, delta: 5 }, // ok
      { level: { ...level(2, 0), inventory_item_id: "b", location_id: "L1" }, delta: -5 }, // 음수
      { level: { ...level(10, 8), inventory_item_id: "c", location_id: "L1" }, delta: -3 }, // 예약초과
      { level: { ...level(4, 0), inventory_item_id: "d", location_id: "L1" }, delta: -4 }, // ok(0)
    ]);
    expect(report.total).toBe(4);
    expect(report.applicable).toHaveLength(2);
    expect(report.rejected).toHaveLength(2);
    expect(report.applicable.map((a) => a.level.inventory_item_id)).toEqual(["a", "d"]);
    expect(report.rejected.map((r) => r.code)).toEqual(["NEGATIVE_STOCK", "BELOW_RESERVED"]);
  });

  it("전부 적용 가능하면 rejected 0", () => {
    const report = buildBulkAdjustReport([{ level: level(10, 0), delta: 1 }]);
    expect(report.rejected).toHaveLength(0);
    expect(report.applicable).toHaveLength(1);
  });
});
