/**
 * 정산 — Medusa 코어에 정산 개념 없음(GAP_B). 실 주문 결제 데이터로 집계(날조 없음).
 *  - 주문 결제(payment_collections.payments) 의 승인/캡처 금액 + 환불(refunds.amount) 으로 산출.
 *  - 순 정산액 = 캡처(실 수금) - 환불.
 *  - PG 수수료·세금계산서·실제 지급(payout) 은 정산 커스텀 모듈(후속) — 본 화면은 결제 기반 집계.
 */
import { apiFetch } from "./client";
import {
  buildSettlementRows,
  aggregateKpi,
  aggregateDaily,
  type RawSettlementOrder,
} from "@/lib/settlement/settlement-logic";

export type SettlementOrder = {
  id: string;
  display_id: number;
  date: string;
  currency: string;
  gross: number;
  captured: number;
  refund: number;
  net: number;
  payment_status: string;
};

export type SettlementDaily = {
  date: string;
  gross: number;
  captured: number;
  refund: number;
  net: number;
  count: number;
};

export type SettlementSummary = {
  currency: string;
  kpi: { gross: number; captured: number; refund: number; net: number; orders: number };
  daily: SettlementDaily[];
  orders: SettlementOrder[];
};

const FIELDS =
  "id,display_id,created_at,currency_code,status,payment_status,total," +
  "payment_collections.payments.amount,payment_collections.payments.captured_at," +
  "payment_collections.payments.refunds.amount";

/**
 * 정산 집계(취소 주문 제외).
 * 집계 로직은 순수함수 모듈(settlement-logic)에 위임(§V0 단일 진실 · vitest 검증).
 * PG 수수료율은 미설정(0) — 정책 확정 시 buildSettlementRows 2번째 인자로 주입(net 자동 반영).
 */
export async function getSettlementSummary(): Promise<SettlementSummary> {
  const { orders } = await apiFetch<{ orders: RawSettlementOrder[]; count: number }>(
    `/admin/orders?limit=200&order=-display_id&fields=${FIELDS}`
  );
  const currency = orders[0]?.currency_code ?? "krw";

  const pureRows = buildSettlementRows(orders);
  const pureKpi = aggregateKpi(pureRows);
  const pureDaily = aggregateDaily(pureRows);

  // 기존 화면 출력 shape 유지(pgFee 는 KPI/일별엔 미노출, 행 net 에 반영)
  const rows: SettlementOrder[] = pureRows.map((r) => ({
    id: r.id,
    display_id: r.display_id,
    date: r.date,
    currency: r.currency,
    gross: r.gross,
    captured: r.captured,
    refund: r.refund,
    net: r.net,
    payment_status: r.payment_status,
  }));
  const kpi = {
    gross: pureKpi.gross,
    captured: pureKpi.captured,
    refund: pureKpi.refund,
    net: pureKpi.net,
    orders: pureKpi.orders,
  };
  const daily: SettlementDaily[] = pureDaily.map((d) => ({
    date: d.date,
    gross: d.gross,
    captured: d.captured,
    refund: d.refund,
    net: d.net,
    count: d.count,
  }));

  return { currency, kpi, daily, orders: rows };
}
