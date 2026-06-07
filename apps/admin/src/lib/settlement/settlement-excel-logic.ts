/**
 * 정산 엑셀(CSV) 순수 로직 모듈 (d7 t003_정산엑셀 spec §9 — 갭B)
 *
 * - 순수 함수만 → vitest 단위 테스트 가능.
 * - production 연결: 정산 화면 다운로드 버튼이 settlementRowsToCsv / settlementDailyToCsv 호출.
 * - 엑셀은 UTF-8 BOM CSV 로 제공(한글 깨짐 방지). 실제 .xlsx 라이브러리 도입은 후속(선택).
 */

import type { SettlementRow, SettlementDaily } from "./settlement-logic";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

const ROW_HEADERS = [
  "주문번호",
  "귀속일",
  "통화",
  "결제승인",
  "실수금",
  "환불",
  "PG수수료",
  "순정산",
  "결제상태",
] as const;

/** 주문별 정산 행 → CSV (BOM + 한글헤더). */
export function settlementRowsToCsv(rows: SettlementRow[]): string {
  const header = ROW_HEADERS.map(escapeCsvCell).join(",");
  const lines = rows.map((r) =>
    [
      `#${r.display_id}`,
      r.date,
      r.currency,
      String(r.gross),
      String(r.captured),
      String(r.refund),
      String(r.pgFee),
      String(r.net),
      r.payment_status,
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  return "﻿" + [header, ...lines].join("\n");
}

const DAILY_HEADERS = ["정산일", "결제승인", "실수금", "환불", "PG수수료", "순정산", "건수"] as const;

/** 일별 정산 → CSV (BOM + 한글헤더). */
export function settlementDailyToCsv(daily: SettlementDaily[]): string {
  const header = DAILY_HEADERS.map(escapeCsvCell).join(",");
  const lines = daily.map((d) =>
    [
      d.date,
      String(d.gross),
      String(d.captured),
      String(d.refund),
      String(d.pgFee),
      String(d.net),
      String(d.count),
    ]
      .map(escapeCsvCell)
      .join(",")
  );
  return "﻿" + [header, ...lines].join("\n");
}
