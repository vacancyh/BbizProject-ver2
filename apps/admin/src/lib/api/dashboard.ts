/**
 * 대시보드 요약 — 실 Medusa 데이터 집계(날조 없음).
 *  - 주문: /admin/orders 전량(최대 100건) 1회 조회 후 클라이언트 집계
 *  - 상품/회원 수: count 메타만 사용(limit=1)
 *  - 미답변 문의: /admin/reviews (type=inquiry, status=pending) count
 *  - 품절 임박: /admin/inventory-items 가용수량 낮은 항목
 *  - 매출 추이: 최근 7일 일별 매출(주문 created_at 그룹)
 *  - 카테고리별 매출: 주문 라인아이템 product_id → product category 매핑 집계(데이터 없으면 빈 배열)
 *  - 리뷰·문의 피드: /admin/reviews 최근 N건
 * 데이터원 부재 시 해당 섹션은 빈 배열로 정직 처리(억지 mock 금지).
 */
import { apiFetch } from "./client";
import { listReviews, type ReviewItem } from "./reviews";
import { listInventoryItems } from "./inventory";
import {
  filterOrdersByPeriod,
  calcWidgetCounts,
  type Period,
} from "../dashboard/dashboard-logic";

export type DashOrderItem = {
  product_title: string | null;
  product_id: string | null;
  quantity: number;
  total: number;
};
export type DashOrder = {
  id: string;
  display_id: number;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total: number;
  currency_code: string;
  email: string | null;
  created_at: string;
  items?: DashOrderItem[];
};

export type DashPriority = {
  key: string;
  label: string;
  sub: string;
  count: number;
  route: string;
  tone: "blue" | "amber" | "red";
  icon: string;
};

export type DashKpi = {
  key: string;
  label: string;
  value: string;
  icon: string;
  attn?: boolean;
};

/** 차트 색상 토큰(globals.css --c1..c4 / 상태색과 동일 hex). */
const C = {
  c1: "#2563eb",
  c2: "#0ea5e9",
  c3: "#94a3b8",
  c4: "#1e293b",
  warning: "#d97706",
  danger: "#dc2626",
  success: "#16a34a",
};

export type SalesTrend = {
  labels: string[];
  series: { name: string; color: string; data: number[] }[];
};
export type BarItem = { label: string; value: number; color: string };
export type DonutSegment = { label: string; value: number; color: string };
export type FeedItem = {
  type: "review" | "inquiry";
  txt: string;
  meta: string;
  stars: number | null;
  tone: "amber" | "blue";
};
export type LowStockItem = {
  title: string;
  sku: string;
  qty: number;
  badge: string;
  tone: "warning" | "danger";
};
export type RankProduct = { title: string; sub: string; qty: number; amount: number };

export type DashboardSummary = {
  currency: string;
  date: string;
  updated: string;
  kpis: DashKpi[];
  priorities: DashPriority[];
  salesTrend: SalesTrend;
  queue: { icon: string; ic: string; t: string; s: string; n: number; hot: boolean }[];
  orderStatus: BarItem[];
  category: DonutSegment[];
  recentOrders: DashOrder[];
  topProducts: RankProduct[];
  feed: FeedItem[];
  lowStock: LowStockItem[];
};

// ── 정산 KPI 타입 ──
export type SettlementKpi = {
  sales: number;
  refund: number;
  pgFee: number;
  net: number;
  held: number;
};
export type KpiAlert = {
  code: string;
  message: string;
  severity?: string;
};
export type SettlementKpiResponse = {
  kpi: SettlementKpi;
  alerts: KpiAlert[];
  period: string;
};

/** 정산 KPI + 경보 조회. period 미지정 시 today. */
export async function getSettlementKpi(
  period?: "today" | "week" | "month"
): Promise<SettlementKpiResponse> {
  return apiFetch<SettlementKpiResponse>(
    `/admin/dashboard/settlement-kpi${period ? `?period=${period}` : ""}`
  );
}

const ORDER_FIELDS =
  "id,display_id,status,payment_status,fulfillment_status,total,currency_code,email,created_at," +
  "items.product_title,items.product_id,items.quantity,items.total";

function fmtWon(v: number): string {
  return "₩" + Math.round(v).toLocaleString("ko-KR");
}

/** 대시보드 집계 데이터 1회 로드. period 기본값 = 'today' (기존 동작 보존). */
export async function getDashboardSummary(period: Period = "today"): Promise<DashboardSummary> {
  const [ordersRes, _productsRes, customersRes, productCatRes, inquiryRes, reviewFeedRes, invRes] =
    await Promise.all([
      apiFetch<{ orders: DashOrder[]; count: number }>(
        `/admin/orders?limit=100&order=-display_id&fields=${ORDER_FIELDS}`
      ),
      apiFetch<{ count: number }>(`/admin/products?limit=1&fields=id`),
      apiFetch<{ count: number }>(`/admin/customers?limit=1&fields=id`),
      // 상품 → 카테고리 매핑(도넛 집계용)
      apiFetch<{ products: { id: string; categories?: { name: string }[] }[] }>(
        `/admin/products?limit=200&fields=id,categories.name`
      ).catch(() => ({ products: [] })),
      // 미답변 문의 count
      listReviews({ type: "inquiry", status: "pending", limit: 1 }).catch(() => ({
        reviews: [] as ReviewItem[],
        count: 0,
      })),
      // 리뷰·문의 피드(최근)
      listReviews({ limit: 6 }).catch(() => ({ reviews: [] as ReviewItem[], count: 0 })),
      // 재고(품절 임박)
      listInventoryItems({ limit: 100 }).catch(() => ({ inventory_items: [], count: 0 })),
    ]);

  const orders = ordersRes.orders ?? [];
  const currency = orders[0]?.currency_code ?? "krw";
  const now = new Date();

  // 품절 임박(가용 25개 이하). 가용수량 = stocked - reserved 또는 location_levels 합.
  const invItems = invRes.inventory_items ?? [];
  const availOf = (it: (typeof invItems)[number]): number => {
    if (it.location_levels && it.location_levels.length) {
      return it.location_levels.reduce((a, l) => a + (l.available_quantity ?? 0), 0);
    }
    return (it.stocked_quantity ?? 0) - (it.reserved_quantity ?? 0);
  };
  const lowStockItems = invItems
    .map((it) => ({ it, avail: availOf(it) }))
    .filter((x) => x.avail <= 25)
    .sort((a, b) => a.avail - b.avail);

  const unansweredInquiry = inquiryRes.count ?? 0;

  // ── 위젯 5종 카운트: dashboard-logic 순수 함수 호출 ──
  const widgets = calcWidgetCounts(orders, customersRes.count ?? 0, lowStockItems.length, now);
  const { todayRevenue, todayOrders: todayOrderCount, shipPending: shipReady, lowStockCount, newMembers, awaitingPay, refundReq } = widgets;

  // ── 기간 필터 적용: 선택된 period 기준 주문 필터링(매출 추이 등) ──
  const active = orders.filter((o) => o.status !== "canceled");
  const periodOrders = filterOrdersByPeriod(active, period, now);

  const priorities: DashPriority[] = [
    { key: "await", label: "결제 대기", sub: "결제 확인 필요", count: awaitingPay, route: "/orders", tone: "blue", icon: "clock" },
    { key: "ship", label: "배송 준비", sub: "송장 등록 대기", count: shipReady, route: "/shipping", tone: "amber", icon: "package" },
    { key: "refund", label: "환불·취소 요청", sub: "24시간 내 처리", count: refundReq, route: "/orders", tone: "red", icon: "refund" },
    { key: "inquiry", label: "미답변 문의", sub: "CS 응대 필요", count: unansweredInquiry, route: "/reviews", tone: "blue", icon: "message" },
    { key: "lowstock", label: "품절 임박 상품", sub: "재고 확인 필요", count: lowStockCount, route: "/products", tone: "amber", icon: "alert" },
  ];

  // ── KPI 그리드(디자인 순서/라벨: 오늘 매출/오늘 주문/결제대기/배송준비/취소·환불/신규회원) ──
  const kpis: DashKpi[] = [
    { key: "todayRevenue", label: "오늘 매출", value: fmtWon(todayRevenue), icon: "won" },
    { key: "todayOrders", label: "오늘 주문", value: todayOrderCount.toLocaleString("ko-KR"), icon: "cart" },
    { key: "awaitPay", label: "결제 대기", value: awaitingPay.toLocaleString("ko-KR"), icon: "clock", attn: awaitingPay > 0 },
    { key: "shipReady", label: "배송 준비", value: shipReady.toLocaleString("ko-KR"), icon: "package", attn: shipReady > 0 },
    { key: "refund", label: "취소·환불", value: refundReq.toLocaleString("ko-KR"), icon: "refund" },
    { key: "newMembers", label: "신규 회원", value: newMembers.toLocaleString("ko-KR"), icon: "userPlus" },
  ];

  // ── 매출 추이: period 기준 일별 집계 ──
  // period='today' → 1일, 'week' → 최근 7일, 'month' → 이번 달 1일~오늘
  const dayKeys: string[] = [];
  if (period === "month") {
    for (let i = 1; i <= now.getDate(); i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }
  } else {
    const rangeBack = period === "week" ? 6 : 0;
    for (let i = rangeBack; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dayKeys.push(d.toISOString().slice(0, 10));
    }
  }
  // periodOrders 는 기간 필터 적용된 주문 — 추이 집계에도 동일 period 적용
  const revByDay = new Map<string, number>(dayKeys.map((k) => [k, 0]));
  for (const o of periodOrders) {
    const k = (o.created_at ?? "").slice(0, 10);
    if (revByDay.has(k)) revByDay.set(k, (revByDay.get(k) ?? 0) + (o.total || 0));
  }
  const salesTrend: SalesTrend = {
    labels: dayKeys.map((k) => `${+k.slice(5, 7)}/${+k.slice(8, 10)}`),
    series: [{ name: "매출", color: C.c1, data: dayKeys.map((k) => revByDay.get(k) ?? 0) }],
  };

  // ── 주문 상태 분포(bar) ──
  const fulfillLabels: Record<string, string> = {
    not_fulfilled: "미출고",
    fulfilled: "출고 완료",
    partially_fulfilled: "부분 출고",
    shipped: "배송 중",
    partially_shipped: "부분 배송",
    delivered: "배송 완료",
    canceled: "취소",
  };
  const distMap = new Map<string, number>();
  for (const o of orders) {
    const label = fulfillLabels[o.fulfillment_status] ?? o.fulfillment_status;
    distMap.set(label, (distMap.get(label) ?? 0) + 1);
  }
  const orderStatus: BarItem[] = [...distMap.entries()]
    .map(([label, value]) => ({ label, value, color: C.c1 }))
    .sort((a, b) => b.value - a.value);

  // ── 카테고리별 매출 도넛: 상품→카테고리 매핑 후 라인아이템 금액 집계 ──
  const prodCat = new Map<string, string>();
  for (const p of productCatRes.products ?? []) {
    const cat = p.categories?.[0]?.name;
    if (cat) prodCat.set(p.id, cat);
  }
  const catRevenue = new Map<string, number>();
  for (const o of active) {
    for (const it of o.items ?? []) {
      const cat = it.product_id ? prodCat.get(it.product_id) : undefined;
      if (!cat) continue;
      catRevenue.set(cat, (catRevenue.get(cat) ?? 0) + (it.total ?? 0));
    }
  }
  const palette = [C.c1, C.c2, C.c3, C.c4, C.warning];
  const category: DonutSegment[] = [...catRevenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));

  // ── 인기 상품(수량 기준 TOP 5) ──
  const prodMap = new Map<string, { qty: number; amount: number; cat: string }>();
  for (const o of active) {
    for (const it of o.items ?? []) {
      const title = it.product_title ?? "(이름 없음)";
      const cur = prodMap.get(title) ?? { qty: 0, amount: 0, cat: "" };
      cur.qty += it.quantity ?? 0;
      cur.amount += it.total ?? 0;
      if (!cur.cat && it.product_id) cur.cat = prodCat.get(it.product_id) ?? "";
      prodMap.set(title, cur);
    }
  }
  const topProducts: RankProduct[] = [...prodMap.entries()]
    .map(([title, v]) => ({ title, sub: v.cat || "상품", qty: v.qty, amount: v.amount }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // ── 처리 대기 큐 ──
  const queue = [
    { icon: "clock", ic: "blue", t: "결제 대기", s: "결제 확인 필요", n: awaitingPay, hot: false },
    { icon: "package", ic: "amber", t: "배송 준비", s: "송장 등록 대기", n: shipReady, hot: shipReady > 0 },
    { icon: "refund", ic: "red", t: "환불·취소", s: "24시간 내 처리", n: refundReq, hot: false },
    { icon: "message", ic: "blue", t: "미답변 문의", s: "CS 응대 필요", n: unansweredInquiry, hot: false },
  ];

  // ── 리뷰·문의 피드 ──
  const feed: FeedItem[] = (reviewFeedRes.reviews ?? []).slice(0, 5).map((r) => ({
    type: r.type,
    txt: r.title || r.content || (r.type === "review" ? "새 리뷰" : "새 문의"),
    meta: `${r.author_name ?? "고객"} · ${r.product_title ?? "상품"}`,
    stars: r.type === "review" ? r.rating : null,
    tone: r.type === "review" ? "amber" : "blue",
  }));

  // ── 품절 임박 목록 ──
  const lowStock: LowStockItem[] = lowStockItems.slice(0, 6).map(({ it, avail }) => ({
    title: it.title || it.sku || "(이름 없음)",
    sku: it.sku || "—",
    qty: avail,
    badge: avail <= 0 ? "품절" : "임박",
    tone: avail <= 0 ? "danger" : "warning",
  }));

  return {
    currency,
    date: now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }),
    updated: now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    kpis,
    priorities,
    salesTrend,
    queue,
    orderStatus,
    category,
    recentOrders: orders.slice(0, 5),
    topProducts,
    feed,
    lowStock,
  };
}
