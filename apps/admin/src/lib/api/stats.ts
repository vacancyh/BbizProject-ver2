/**
 * 통계·리포트 — Medusa 코어에 분석 API 없음(GAP_B). 실 주문 데이터 집계(날조 없음).
 *  - 매출 추이(일별), 평균 주문액(AOV), 주문/결제 상태 분포, 인기 상품(매출·수량).
 *  - 취소 주문 제외. 금액은 주문 total 기준.
 */
import { apiFetch } from "./client";

export type StatsDaily = { date: string; revenue: number; orders: number };
export type StatsDist = { label: string; count: number };
export type StatsTopProduct = { title: string; qty: number; revenue: number };

export type StatsSummary = {
  currency: string;
  kpi: { revenue: number; orders: number; aov: number; refunded: number };
  daily: StatsDaily[];
  fulfillDist: StatsDist[];
  payDist: StatsDist[];
  topByRevenue: StatsTopProduct[];
  topByQty: StatsTopProduct[];
};

const FIELDS =
  "id,display_id,created_at,currency_code,status,payment_status,fulfillment_status,total," +
  "items.product_title,items.quantity,items.total";

type RawOrder = {
  created_at: string;
  currency_code: string;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total: number;
  items?: { product_title?: string | null; quantity?: number; total?: number }[];
};

const FULFILL_LABEL: Record<string, string> = {
  not_fulfilled: "미출고",
  fulfilled: "출고 완료",
  partially_fulfilled: "부분 출고",
  shipped: "배송 중",
  delivered: "배송 완료",
  canceled: "취소",
};
const PAY_LABEL: Record<string, string> = {
  authorized: "결제 승인",
  captured: "결제 완료",
  partially_refunded: "부분 환불",
  refunded: "환불 완료",
  canceled: "결제 취소",
  not_paid: "미결제",
  awaiting: "입금 대기",
};

function distOf(orders: RawOrder[], key: "fulfillment_status" | "payment_status", labels: Record<string, string>): StatsDist[] {
  const m = new Map<string, number>();
  for (const o of orders) {
    const label = labels[o[key]] ?? o[key];
    m.set(label, (m.get(label) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export async function getStatsSummary(): Promise<StatsSummary> {
  const { orders } = await apiFetch<{ orders: RawOrder[]; count: number }>(
    `/admin/orders?limit=200&order=-display_id&fields=${FIELDS}`
  );
  const currency = orders[0]?.currency_code ?? "krw";
  const active = orders.filter((o) => o.status !== "canceled");

  const revenue = active.reduce((a, o) => a + (o.total || 0), 0);
  const refunded = orders.filter((o) => ["refunded", "partially_refunded"].includes(o.payment_status)).length;
  const aov = active.length ? Math.round(revenue / active.length) : 0;

  // 일별 매출
  const dmap = new Map<string, StatsDaily>();
  for (const o of active) {
    const date = (o.created_at ?? "").slice(0, 10);
    const cur = dmap.get(date) ?? { date, revenue: 0, orders: 0 };
    cur.revenue += o.total || 0;
    cur.orders += 1;
    dmap.set(date, cur);
  }
  const daily = [...dmap.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

  // 인기 상품
  const pmap = new Map<string, { qty: number; revenue: number }>();
  for (const o of active) {
    for (const it of o.items ?? []) {
      const title = it.product_title ?? "(이름 없음)";
      const cur = pmap.get(title) ?? { qty: 0, revenue: 0 };
      cur.qty += it.quantity ?? 0;
      cur.revenue += it.total ?? 0;
      pmap.set(title, cur);
    }
  }
  const products = [...pmap.entries()].map(([title, v]) => ({ title, ...v }));
  const topByRevenue = [...products].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topByQty = [...products].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return {
    currency,
    kpi: { revenue, orders: active.length, aov, refunded },
    daily,
    fulfillDist: distOf(active, "fulfillment_status", FULFILL_LABEL),
    payDist: distOf(active, "payment_status", PAY_LABEL),
    topByRevenue,
    topByQty,
  };
}
