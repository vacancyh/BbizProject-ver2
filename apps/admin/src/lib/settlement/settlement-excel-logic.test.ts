/**
 * settlement-excel-logic 단위 테스트 (d7 t003_정산엑셀)
 * spec: dag/d7_정산관리/t003_정산엑셀.md §9 — 정산 결과 CSV 다운로드
 */
import { describe, it, expect } from "vitest";
import { settlementRowsToCsv, settlementDailyToCsv } from "./settlement-excel-logic";
import type { SettlementRow, SettlementDaily } from "./settlement-logic";

const rows: SettlementRow[] = [
  {
    id: "o1",
    display_id: 1,
    date: "2026-06-01",
    currency: "krw",
    gross: 10_000,
    captured: 10_000,
    refund: 2_000,
    pgFee: 300,
    net: 7_700,
    payment_status: "captured",
  },
];

const daily: SettlementDaily[] = [
  { date: "2026-06-01", gross: 10_000, captured: 10_000, refund: 2_000, pgFee: 300, net: 7_700, count: 1 },
];

describe("settlementRowsToCsv", () => {
  it("BOM + 한글 헤더 + 데이터 행", () => {
    const csv = settlementRowsToCsv(rows);
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.replace(/^﻿/, "").split("\n");
    expect(lines[0]).toContain("주문번호");
    expect(lines[0]).toContain("PG수수료");
    expect(lines[0]).toContain("순정산");
    expect(lines[1]).toContain("#1");
    expect(lines[1]).toContain("7700");
  });
  it("빈 목록도 헤더 출력", () => {
    expect(settlementRowsToCsv([]).replace(/^﻿/, "").split("\n")).toHaveLength(1);
  });
});

describe("settlementDailyToCsv", () => {
  it("BOM + 일별 헤더 + 데이터", () => {
    const csv = settlementDailyToCsv(daily);
    const lines = csv.replace(/^﻿/, "").split("\n");
    expect(lines[0]).toContain("정산일");
    expect(lines[0]).toContain("순정산");
    expect(lines[1]).toContain("2026-06-01");
    expect(lines[1]).toContain("7700");
  });
});
