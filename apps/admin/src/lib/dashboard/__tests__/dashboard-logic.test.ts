/**
 * 단위 테스트 — t001_대시보드위젯 (unit_001)
 *
 * production 코드 import: @/lib/dashboard/dashboard-logic (복제 없음)
 * 호출처: apps/admin/src/lib/api/dashboard.ts 의 getDashboardSummary 가
 *   filterOrdersByPeriod / calcWidgetCounts 를 실제 호출.
 *
 * UT-001: 위젯 5종 카운트 산출 — 샘플 주문 배열로 5종 값 검증.
 * UT-002: 기간 토글 재집계 — today/week/month 필터 결과 차이 검증.
 */

import { describe, it, expect } from "vitest";
import {
  filterOrdersByPeriod,
  calcWidgetCounts,
  calcPeriodRevenue,
  type OrderForLogic,
  type Period,
} from "../dashboard-logic";

// ─── 공용 픽스처 ─────────────────────────────────────────────────────────────

/** 기준 시각: 2024-03-15T12:00:00Z */
const NOW = new Date("2024-03-15T12:00:00Z");

function makeOrder(overrides: Partial<OrderForLogic>): OrderForLogic {
  return {
    status: "pending",
    payment_status: "captured",
    fulfillment_status: "not_fulfilled",
    total: 10000,
    created_at: "2024-03-15T09:00:00Z",
    ...overrides,
  };
}

/** 오늘(2024-03-15) 주문 3건 */
const todayOrders: OrderForLogic[] = [
  makeOrder({ total: 50000, created_at: "2024-03-15T01:00:00Z" }),
  makeOrder({ total: 30000, created_at: "2024-03-15T10:00:00Z" }),
  makeOrder({ total: 20000, created_at: "2024-03-15T11:00:00Z", status: "canceled" }),
];

/** 이번 주(2024-03-09~14) 주문 2건 */
const weekOrders: OrderForLogic[] = [
  makeOrder({ total: 15000, created_at: "2024-03-12T08:00:00Z" }),
  makeOrder({ total: 25000, created_at: "2024-03-14T16:00:00Z" }),
];

/** 이번 달(2024-03-01~07) 주문 2건 */
const monthEarlyOrders: OrderForLogic[] = [
  makeOrder({ total: 80000, created_at: "2024-03-01T00:00:00Z" }),
  makeOrder({ total: 60000, created_at: "2024-03-07T23:00:00Z" }),
];

/** 지난 달(2024-02) 주문 — month 필터에서 제외돼야 함 */
const prevMonthOrders: OrderForLogic[] = [
  makeOrder({ total: 100000, created_at: "2024-02-28T12:00:00Z" }),
];

/** 전체 주문 배열: 오늘 + 이번 주 + 이번 달 초 + 지난 달 */
const allOrders: OrderForLogic[] = [
  ...todayOrders,
  ...weekOrders,
  ...monthEarlyOrders,
  ...prevMonthOrders,
];

// ─── UT-001: 위젯 5종 카운트 산출 ────────────────────────────────────────────

describe("UT-001 위젯 5종 카운트 산출 (unit_001 #1)", () => {
  it("todayRevenue: 오늘 취소 제외 주문 총액 = 80,000", () => {
    const w = calcWidgetCounts(todayOrders, 5, 3, NOW);
    // 오늘 주문: 50000 + 30000 = 80000 (canceled 20000 제외)
    expect(w.todayRevenue).toBe(80000);
  });

  it("todayOrders: 오늘 취소 제외 주문 수 = 2", () => {
    const w = calcWidgetCounts(todayOrders, 5, 3, NOW);
    expect(w.todayOrders).toBe(2);
  });

  it("shipPending: fulfillment_status=not_fulfilled + payment captured + 미취소 = 2", () => {
    const orders: OrderForLogic[] = [
      makeOrder({ fulfillment_status: "not_fulfilled", payment_status: "captured" }),
      makeOrder({ fulfillment_status: "not_fulfilled", payment_status: "authorized" }),
      makeOrder({ fulfillment_status: "fulfilled", payment_status: "captured" }),          // 출고 완료 제외
      makeOrder({ fulfillment_status: "not_fulfilled", payment_status: "not_paid" }),     // 미결제 제외
      makeOrder({ fulfillment_status: "not_fulfilled", status: "canceled", payment_status: "captured" }), // 취소 제외
    ];
    const w = calcWidgetCounts(orders, 0, 0, NOW);
    expect(w.shipPending).toBe(2);
  });

  it("lowStockCount: 주입한 값 그대로 반환 = 7", () => {
    const w = calcWidgetCounts([], 0, 7, NOW);
    expect(w.lowStockCount).toBe(7);
  });

  it("newMembers: 주입한 회원 수 그대로 반환 = 12", () => {
    const w = calcWidgetCounts([], 12, 0, NOW);
    expect(w.newMembers).toBe(12);
  });

  it("awaitingPay: not_paid / awaiting / requires_action 포함 = 3", () => {
    const orders: OrderForLogic[] = [
      makeOrder({ payment_status: "not_paid" }),
      makeOrder({ payment_status: "awaiting" }),
      makeOrder({ payment_status: "requires_action" }),
      makeOrder({ payment_status: "captured" }),  // 제외
    ];
    const w = calcWidgetCounts(orders, 0, 0, NOW);
    expect(w.awaitingPay).toBe(3);
  });
});

// ─── UT-002: 기간 토글 재집계 ─────────────────────────────────────────────────

describe("UT-002 기간 토글 재집계 (unit_001 #2)", () => {
  it("today 필터: 오늘 주문만 반환 (지난주/지난달 제외)", () => {
    const result = filterOrdersByPeriod(allOrders, "today", NOW);
    // 오늘(2024-03-15) 3건
    expect(result.length).toBe(3);
    result.forEach((o) => {
      expect(o.created_at.slice(0, 10)).toBe("2024-03-15");
    });
  });

  it("week 필터: 최근 7일(03-09~03-15) 포함, 지난달 제외", () => {
    const result = filterOrdersByPeriod(allOrders, "week", NOW);
    // 오늘 3건 + 이번 주 2건 = 5건 (월초 + 지난달 제외)
    expect(result.length).toBe(5);
    result.forEach((o) => {
      const d = o.created_at.slice(0, 10);
      expect(d >= "2024-03-09" && d <= "2024-03-15").toBe(true);
    });
  });

  it("month 필터: 이번 달(03-01~03-15) 포함, 지난달(02) 제외", () => {
    const result = filterOrdersByPeriod(allOrders, "month", NOW);
    // 오늘 3건 + 이번 주 2건 + 월초 2건 = 7건 (지난달 1건 제외)
    expect(result.length).toBe(7);
    result.forEach((o) => {
      expect(o.created_at.slice(0, 7)).toBe("2024-03");
    });
  });

  it("today vs week: today 매출 < week 매출 (기간 확장 시 값 증가)", () => {
    const todayRev = calcPeriodRevenue(allOrders, "today", NOW);
    const weekRev = calcPeriodRevenue(allOrders, "week", NOW);
    expect(weekRev).toBeGreaterThan(todayRev);
  });

  it("week vs month: week 매출 < month 매출 (기간 확장 시 값 증가)", () => {
    const weekRev = calcPeriodRevenue(allOrders, "week", NOW);
    const monthRev = calcPeriodRevenue(allOrders, "month", NOW);
    expect(monthRev).toBeGreaterThan(weekRev);
  });

  it("기간별 집계 수치 차이 정량 검증 — today/week/month 모두 다름", () => {
    const t = filterOrdersByPeriod(allOrders, "today", NOW).length;
    const w = filterOrdersByPeriod(allOrders, "week", NOW).length;
    const m = filterOrdersByPeriod(allOrders, "month", NOW).length;
    // today < week < month 순서 보장
    expect(t).toBeLessThan(w);
    expect(w).toBeLessThan(m);
  });
});
