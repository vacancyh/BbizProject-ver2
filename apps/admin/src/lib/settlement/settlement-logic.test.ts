/**
 * settlement-logic 단위 테스트 (d7 t001_결제원장 / t002_정산집계)
 * spec: dag/d7_정산관리/t001·t002 §9
 *  - 결제원장 흐름 집계 / 매출·환불·PG수수료·순정산 / 날짜귀속 / 취소 제외
 * production 함수 직접 import — settlement.ts getSettlementSummary 가 호출하는 바로 그 함수.
 */
import { describe, it, expect } from "vitest";
import {
  assignSettlementDate,
  calcPgFee,
  aggregateOrderSettlement,
  buildSettlementRows,
  aggregateKpi,
  aggregateDaily,
  type RawSettlementOrder,
} from "./settlement-logic";

function order(
  id: string,
  display_id: number,
  created_at: string,
  payments: { amount: number; captured?: boolean; refunds?: number[] }[],
  status = "completed"
): RawSettlementOrder {
  return {
    id,
    display_id,
    created_at,
    currency_code: "krw",
    status,
    payment_status: "captured",
    payment_collections: [
      {
        payments: payments.map((p) => ({
          amount: p.amount,
          captured_at: p.captured === false ? null : "2026-06-01T00:00:00.000Z",
          refunds: (p.refunds ?? []).map((a) => ({ amount: a })),
        })),
      },
    ],
  };
}

describe("assignSettlementDate (날짜경계 귀속)", () => {
  it("기본 YYYY-MM-DD", () => {
    expect(assignSettlementDate("2026-06-04T15:30:00.000Z")).toBe("2026-06-04");
  });
  it("cutoffHour 이전 결제는 전일 귀속", () => {
    // 03시 cutoff, 결제 02시(UTC) → 전일
    expect(assignSettlementDate("2026-06-04T02:00:00.000Z", 3)).toBe("2026-06-03");
    expect(assignSettlementDate("2026-06-04T04:00:00.000Z", 3)).toBe("2026-06-04");
  });
  it("잘못된 일자 빈 문자열", () => {
    expect(assignSettlementDate("nope")).toBe("");
  });
});

describe("calcPgFee", () => {
  it("수금액 × 수수료율 내림", () => {
    expect(calcPgFee(10_000, 3)).toBe(300);
    expect(calcPgFee(9_999, 3)).toBe(299); // floor
    expect(calcPgFee(10_000, 0)).toBe(0);
  });
  it("음수 수금 0", () => {
    expect(calcPgFee(-100, 3)).toBe(0);
  });
  it("수수료율 범위 위반 throw", () => {
    expect(() => calcPgFee(100, 101)).toThrow();
  });
});

describe("aggregateOrderSettlement (t001 결제원장)", () => {
  it("gross/captured/refund/net 집계", () => {
    const r = aggregateOrderSettlement(
      order("o1", 1, "2026-06-01T00:00:00.000Z", [{ amount: 10_000, refunds: [2_000] }])
    );
    expect(r.gross).toBe(10_000);
    expect(r.captured).toBe(10_000);
    expect(r.refund).toBe(2_000);
    expect(r.pgFee).toBe(0); // rate 0 기본
    expect(r.net).toBe(8_000);
  });
  it("미승인(captured_at null)은 captured 미포함", () => {
    const r = aggregateOrderSettlement(
      order("o2", 2, "2026-06-01T00:00:00.000Z", [{ amount: 5_000, captured: false }])
    );
    expect(r.gross).toBe(5_000);
    expect(r.captured).toBe(0);
    expect(r.net).toBe(0);
  });
  it("PG 수수료율 주입 시 순정산 차감", () => {
    const r = aggregateOrderSettlement(
      order("o3", 3, "2026-06-01T00:00:00.000Z", [{ amount: 10_000 }]),
      3 // 3% 수수료
    );
    expect(r.pgFee).toBe(300);
    expect(r.net).toBe(9_700); // 10000 - 0 - 300
  });
});

describe("buildSettlementRows (취소 제외)", () => {
  it("canceled 주문 제외", () => {
    const rows = buildSettlementRows([
      order("o1", 1, "2026-06-01T00:00:00.000Z", [{ amount: 10_000 }]),
      order("o2", 2, "2026-06-01T00:00:00.000Z", [{ amount: 5_000 }], "canceled"),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("o1");
  });
});

describe("aggregateKpi / aggregateDaily (t002 집계)", () => {
  const rows = buildSettlementRows([
    order("o1", 1, "2026-06-01T00:00:00.000Z", [{ amount: 10_000, refunds: [1_000] }]),
    order("o2", 2, "2026-06-01T00:00:00.000Z", [{ amount: 20_000 }]),
    order("o3", 3, "2026-06-02T00:00:00.000Z", [{ amount: 5_000 }]),
  ]);
  it("KPI 합계", () => {
    const kpi = aggregateKpi(rows);
    expect(kpi.gross).toBe(35_000);
    expect(kpi.captured).toBe(35_000);
    expect(kpi.refund).toBe(1_000);
    expect(kpi.net).toBe(34_000);
    expect(kpi.orders).toBe(3);
  });
  it("일별 집계 + 최신일 우선", () => {
    const daily = aggregateDaily(rows);
    expect(daily).toHaveLength(2);
    expect(daily[0].date).toBe("2026-06-02"); // 최신 우선
    const d1 = daily.find((d) => d.date === "2026-06-01")!;
    expect(d1.count).toBe(2);
    expect(d1.net).toBe(29_000); // (10000-1000)+20000
  });
});
