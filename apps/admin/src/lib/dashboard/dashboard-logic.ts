/**
 * 대시보드 순수 로직 모듈 (t001_대시보드위젯 spec §4)
 *
 * - 이 모듈은 DOM/fetch/React 없는 순수 함수만 포함하므로 vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/lib/api/dashboard.ts 의 getDashboardSummary 가
 *   filterOrdersByPeriod / calcWidgetCounts 를 실제 호출.
 */

/** 기간 토글 타입 */
export type Period = "today" | "week" | "month";

/**
 * 최소 주문 타입 — 순수 로직에서 사용하는 필드만 포함.
 * dashboard.ts DashOrder 의 부분집합.
 */
export type OrderForLogic = {
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total: number;
  created_at: string;
};

/** 위젯 5종 카운트 산출 결과 */
export type WidgetCounts = {
  todayRevenue: number;
  todayOrders: number;
  shipPending: number;
  lowStockCount: number;
  newMembers: number;
  awaitingPay: number;
  refundReq: number;
};

/** 결제 완료 여부 판단 — authorized / captured */
function isCaptured(s: string): boolean {
  return s === "authorized" || s === "captured";
}

/**
 * 기간 필터 함수 (spec §4 I1)
 * period('today'|'week'|'month') + 주문 배열 → 해당 기간 주문만 필터.
 * 기준: now 기준 KST 날짜(toISOString slice 사용).
 */
export function filterOrdersByPeriod<T extends Pick<OrderForLogic, "created_at">>(
  orders: T[],
  period: Period,
  now: Date = new Date()
): T[] {
  const todayStr = now.toISOString().slice(0, 10);

  if (period === "today") {
    return orders.filter((o) => (o.created_at ?? "").slice(0, 10) === todayStr);
  }

  if (period === "week") {
    // 최근 7일(오늘 포함)
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);
    return orders.filter((o) => {
      const d = (o.created_at ?? "").slice(0, 10);
      return d >= weekAgoStr && d <= todayStr;
    });
  }

  // month: 이번 달 1일~오늘
  const monthStart = todayStr.slice(0, 8) + "01";
  return orders.filter((o) => {
    const d = (o.created_at ?? "").slice(0, 10);
    return d >= monthStart && d <= todayStr;
  });
}

/**
 * 위젯 5종 카운트 산출 함수 (spec §3 S1 / UT-001)
 * 주문 배열 + 신규회원 수를 받아 위젯 카운트 5종을 산출한다.
 * 기존 dashboard.ts 계산식을 그대로 옮김(동작 보존).
 *
 * @param orders  전체 주문 배열 (취소 포함, 필터는 호출부에서 처리)
 * @param newMembers  신규 회원 수 (외부 집계값 주입 — API count)
 * @param lowStockCount  품절 임박 상품 수 (외부 집계값 주입)
 * @param now  기준 시각(기본 현재)
 */
export function calcWidgetCounts(
  orders: OrderForLogic[],
  newMembers: number,
  lowStockCount: number,
  now: Date = new Date()
): WidgetCounts {
  const active = orders.filter((o) => o.status !== "canceled");

  const todayStr = now.toISOString().slice(0, 10);
  const todayOrders = active.filter((o) => (o.created_at ?? "").slice(0, 10) === todayStr);
  const todayRevenue = todayOrders.reduce((a, o) => a + (o.total || 0), 0);

  const shipPending = orders.filter(
    (o) =>
      o.fulfillment_status === "not_fulfilled" &&
      o.status !== "canceled" &&
      isCaptured(o.payment_status)
  ).length;

  const awaitingPay = orders.filter((o) =>
    ["not_paid", "awaiting", "requires_action"].includes(o.payment_status)
  ).length;

  const refundReq = orders.filter(
    (o) =>
      o.status === "canceled" ||
      o.payment_status === "partially_refunded" ||
      o.payment_status === "refunded"
  ).length;

  return {
    todayRevenue,
    todayOrders: todayOrders.length,
    shipPending,
    lowStockCount,
    newMembers,
    awaitingPay,
    refundReq,
  };
}

/**
 * 기간별 매출 합계 산출 헬퍼 (기간 필터 적용 후 매출 집계)
 */
export function calcPeriodRevenue(orders: OrderForLogic[], period: Period, now: Date = new Date()): number {
  const active = orders.filter((o) => o.status !== "canceled");
  const filtered = filterOrdersByPeriod(active, period, now);
  return filtered.reduce((a, o) => a + (o.total || 0), 0);
}
