/**
 * 정산 집계 순수 로직 모듈 (d7 t001_결제원장 / t002_정산집계 spec §9 — 갭B)
 *
 * - DOM/fetch/React 없는 순수 함수만 → vitest 단위 테스트 가능.
 * - production 연결: `lib/api/settlement.ts` 의 getSettlementSummary 가 본 모듈 함수를 호출(집계 단일 진실).
 * - Medusa core 에 정산 개념 없음 → 실 주문 결제(payment_collections.payments)로 집계(날조 없음).
 * - PG 수수료율 등 정책 수치는 코드에 박지 않고 **입력으로 주입**(Rule One — 미확정 정책 발명 금지).
 *   수수료 미설정(rate=0) 시 기존 동작(net=captured-refund)과 동일.
 *
 * UT(t001): PaymentCollection→Payment→refund 흐름 집계(원장).
 * UT(t002): 일/월 매출·환불·PG수수료·순정산 + 날짜경계 귀속 + 취소 제외.
 */

/** 코어 주문 결제 raw 부분집합 */
export type RawSettlementOrder = {
  id: string;
  display_id: number;
  created_at: string;
  currency_code: string;
  status: string;
  payment_status: string;
  payment_collections?: {
    payments?: { amount?: number; captured_at?: string | null; refunds?: { amount?: number }[] }[];
  }[];
};

/** 주문 1건 정산 행 */
export type SettlementRow = {
  id: string;
  display_id: number;
  date: string; // 귀속일(YYYY-MM-DD)
  currency: string;
  gross: number; // 결제 시도/승인 합
  captured: number; // 실 수금(captured_at 존재)
  refund: number; // 환불 합
  pgFee: number; // PG 수수료(수금 기준)
  net: number; // 순정산 = captured - refund - pgFee
  payment_status: string;
};

export type SettlementDaily = {
  date: string;
  gross: number;
  captured: number;
  refund: number;
  pgFee: number;
  net: number;
  count: number;
};

export type SettlementKpi = {
  gross: number;
  captured: number;
  refund: number;
  pgFee: number;
  net: number;
  orders: number;
};

/**
 * 날짜 귀속 (날짜경계 귀속) — ISO timestamp → YYYY-MM-DD.
 * cutoffHour 지정 시 그 시각 이전 결제는 전일로 귀속(정산 마감 경계).
 */
export function assignSettlementDate(iso: string, cutoffHour = 0): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  if (cutoffHour > 0 && d.getUTCHours() < cutoffHour) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

/** PG 수수료 계산 — 수금액 × 수수료율(%). 내림. rate 0~100. */
export function calcPgFee(capturedAmount: number, feeRatePercent: number): number {
  if (!(feeRatePercent >= 0 && feeRatePercent <= 100)) {
    throw new Error("PG 수수료율은 0~100% 여야 합니다");
  }
  if (capturedAmount < 0) return 0;
  return Math.floor((capturedAmount * feeRatePercent) / 100);
}

/**
 * 주문 1건 → 정산 행 집계 (t001 결제원장 흐름)
 * @param feeRatePercent PG 수수료율(주입, 기본 0)
 * @param cutoffHour 정산 마감 경계 시(주입, 기본 0)
 */
export function aggregateOrderSettlement(
  o: RawSettlementOrder,
  feeRatePercent = 0,
  cutoffHour = 0
): SettlementRow {
  let gross = 0;
  let captured = 0;
  let refund = 0;
  for (const pc of o.payment_collections ?? []) {
    for (const p of pc.payments ?? []) {
      gross += p.amount ?? 0;
      if (p.captured_at) captured += p.amount ?? 0;
      for (const r of p.refunds ?? []) refund += r.amount ?? 0;
    }
  }
  const pgFee = calcPgFee(captured, feeRatePercent);
  return {
    id: o.id,
    display_id: o.display_id,
    date: assignSettlementDate(o.created_at ?? "", cutoffHour),
    currency: o.currency_code,
    gross,
    captured,
    refund,
    pgFee,
    net: captured - refund - pgFee,
    payment_status: o.payment_status,
  };
}

/** 주문 목록 → 정산 행 목록 (취소 주문 제외). */
export function buildSettlementRows(
  orders: RawSettlementOrder[],
  feeRatePercent = 0,
  cutoffHour = 0
): SettlementRow[] {
  return orders
    .filter((o) => o.status !== "canceled")
    .map((o) => aggregateOrderSettlement(o, feeRatePercent, cutoffHour));
}

/** KPI 합계. */
export function aggregateKpi(rows: SettlementRow[]): SettlementKpi {
  return rows.reduce(
    (a, r) => ({
      gross: a.gross + r.gross,
      captured: a.captured + r.captured,
      refund: a.refund + r.refund,
      pgFee: a.pgFee + r.pgFee,
      net: a.net + r.net,
      orders: a.orders + 1,
    }),
    { gross: 0, captured: 0, refund: 0, pgFee: 0, net: 0, orders: 0 }
  );
}

/** 일별 집계 (최신일 우선 정렬). */
export function aggregateDaily(rows: SettlementRow[]): SettlementDaily[] {
  const dmap = new Map<string, SettlementDaily>();
  for (const r of rows) {
    const cur =
      dmap.get(r.date) ??
      { date: r.date, gross: 0, captured: 0, refund: 0, pgFee: 0, net: 0, count: 0 };
    cur.gross += r.gross;
    cur.captured += r.captured;
    cur.refund += r.refund;
    cur.pgFee += r.pgFee;
    cur.net += r.net;
    cur.count += 1;
    dmap.set(r.date, cur);
  }
  return [...dmap.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}
