/**
 * 단위 테스트 — t002_주문상세 (unit_004)
 *
 * production 코드 import: @/lib/orders/order-detail-logic (복제 없음)
 * 호출처:
 *  - apps/admin/src/app/(admin)/orders/page.tsx 의 상세 드로어가
 *    orderItemSubtotal / sortStateHistory 를 실제 호출.
 *
 * UT-001: 상세 통합 뷰 로드 — 금액 파생(orderItemSubtotal)
 * UT-002: 상태 전이 이력 표시 — sortStateHistory 정렬
 */

import { describe, it, expect } from "vitest";
import {
  orderItemSubtotal,
  sortStateHistory,
  type StateEvent,
} from "../order-detail-logic";
import type { OrderDetail } from "@/lib/api/orders";

// ─── UT-001: 금액 파생 (orderItemSubtotal) ───────────────────────────────────

describe("UT-001 상세 통합 뷰 로드 — 금액 파생 (unit_004 #1)", () => {
  type SubtotalInput = Pick<OrderDetail, "item_subtotal" | "subtotal" | "shipping_total" | "total">;

  it("item_subtotal 있으면 그 값 반환 (최우선)", () => {
    const d: SubtotalInput = {
      item_subtotal: 40000,
      subtotal: 45000,
      shipping_total: 5000,
      total: 50000,
    };
    expect(orderItemSubtotal(d)).toBe(40000);
  });

  it("item_subtotal 없고 subtotal 있으면 subtotal - shipping_total", () => {
    const d: SubtotalInput = {
      item_subtotal: undefined,
      subtotal: 45000,
      shipping_total: 5000,
      total: 50000,
    };
    expect(orderItemSubtotal(d)).toBe(40000);
  });

  it("item_subtotal 없고 subtotal 있고 shipping_total 없으면 subtotal 그대로", () => {
    const d: SubtotalInput = {
      item_subtotal: undefined,
      subtotal: 45000,
      shipping_total: undefined,
      total: 50000,
    };
    expect(orderItemSubtotal(d)).toBe(45000);
  });

  it("item_subtotal/subtotal 모두 없으면 total 반환 (fallback)", () => {
    const d: SubtotalInput = {
      item_subtotal: undefined,
      subtotal: undefined,
      shipping_total: undefined,
      total: 50000,
    };
    expect(orderItemSubtotal(d)).toBe(50000);
  });

  it("item_subtotal = 0 이면 0 반환 (falsy 체크 아닌 null 체크)", () => {
    const d: SubtotalInput = {
      item_subtotal: 0,
      subtotal: 45000,
      shipping_total: 5000,
      total: 50000,
    };
    // item_subtotal = 0 도 존재하는 값 → 0 반환(null/undefined 아님)
    expect(orderItemSubtotal(d)).toBe(0);
  });

  it("shipping_total = 0 이면 subtotal - 0 = subtotal", () => {
    const d: SubtotalInput = {
      item_subtotal: undefined,
      subtotal: 45000,
      shipping_total: 0,
      total: 50000,
    };
    expect(orderItemSubtotal(d)).toBe(45000);
  });
});

// ─── UT-002: StateHistory 정렬 (sortStateHistory) ────────────────────────────

describe("UT-002 상태 전이 이력 표시 — sortStateHistory 정렬 (unit_004 #2)", () => {
  function makeEvent(overrides: Partial<StateEvent> & { created_at: string }): StateEvent {
    return {
      id: `ev_${overrides.created_at}`,
      from_state: null,
      to_state: "pending",
      note: null,
      ...overrides,
    };
  }

  it("created_at 오름차순 정렬 (가장 오래된 이벤트 맨 앞)", () => {
    const events: StateEvent[] = [
      makeEvent({ created_at: "2024-03-15T12:00:00Z", to_state: "completed" }),
      makeEvent({ created_at: "2024-03-10T08:00:00Z", to_state: "pending" }),
      makeEvent({ created_at: "2024-03-12T10:00:00Z", to_state: "requires_action" }),
    ];
    const sorted = sortStateHistory(events);
    expect(sorted[0].to_state).toBe("pending");
    expect(sorted[1].to_state).toBe("requires_action");
    expect(sorted[2].to_state).toBe("completed");
  });

  it("from_state → to_state 표기 문자열(transitionLabel) 파생", () => {
    const events: StateEvent[] = [
      makeEvent({
        created_at: "2024-03-10T08:00:00Z",
        from_state: "pending",
        to_state: "completed",
      }),
    ];
    const sorted = sortStateHistory(events);
    expect(sorted[0].transitionLabel).toBe("pending → completed");
  });

  it("from_state = null 이면 to_state 만 표기", () => {
    const events: StateEvent[] = [
      makeEvent({
        created_at: "2024-03-10T08:00:00Z",
        from_state: null,
        to_state: "pending",
      }),
    ];
    const sorted = sortStateHistory(events);
    expect(sorted[0].transitionLabel).toBe("pending");
  });

  it("빈 배열 입력 → 빈 배열 반환", () => {
    expect(sortStateHistory([])).toEqual([]);
  });

  it("단일 이벤트 → 그대로 반환 + transitionLabel 포함", () => {
    const events: StateEvent[] = [
      makeEvent({
        created_at: "2024-03-10T08:00:00Z",
        from_state: "pending",
        to_state: "canceled",
      }),
    ];
    const sorted = sortStateHistory(events);
    expect(sorted.length).toBe(1);
    expect(sorted[0].transitionLabel).toBe("pending → canceled");
  });

  it("원본 배열 변경 없음 (불변성 보장)", () => {
    const events: StateEvent[] = [
      makeEvent({ created_at: "2024-03-15T12:00:00Z", to_state: "completed" }),
      makeEvent({ created_at: "2024-03-10T08:00:00Z", to_state: "pending" }),
    ];
    const originalFirst = events[0].to_state;
    sortStateHistory(events);
    // 원본 배열 첫 번째 요소는 변경 없어야 함
    expect(events[0].to_state).toBe(originalFirst);
  });

  it("동일 created_at 이벤트 → 안정적으로 처리 (오류 없음)", () => {
    const events: StateEvent[] = [
      makeEvent({ id: "ev1", created_at: "2024-03-10T08:00:00Z", to_state: "pending" }),
      makeEvent({ id: "ev2", created_at: "2024-03-10T08:00:00Z", to_state: "requires_action" }),
    ];
    expect(() => sortStateHistory(events)).not.toThrow();
    const sorted = sortStateHistory(events);
    expect(sorted.length).toBe(2);
  });
});
