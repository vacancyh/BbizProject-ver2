/**
 * 운송장 CSV 일괄 등록 순수 로직 모듈 (d6 t004_운송장CSV일괄 spec §9 — 갭B)
 *
 * - 순수 함수만 → vitest 단위 테스트 가능.
 * - production 연결: 일괄 송장 등록 UI 가 parseWaybillCsv → buildWaybillBatchPlan 으로
 *   유효 행만 추려 주문별 발송 처리(코어 fulfillment) 반복. 실패 행은 리포트.
 * - 백엔드 일괄 import/bulk-ship route 는 미구현(deferred) — 본 모듈은 파싱·검증·매칭 룰만 제공.
 *
 * UT: CSV 파싱 + 택배사/송장형식 검증 + 부분 성공 리포트.
 */

import { isKnownCarrier, validateTrackingNumber, normalizeTrackingNumber } from "./waybill-logic";

/** import 컬럼(한글 헤더) */
export const WAYBILL_COLUMNS = ["주문번호", "택배사", "송장번호"] as const;

export type RawWaybillRow = Record<string, string>;

/** 검증 통과한 발송 행 */
export type ValidWaybillRow = {
  orderRef: string; // 주문번호(display_id 또는 order_id)
  carrierCode: string;
  trackingNumber: string;
};

export type WaybillRowValidation =
  | { ok: true; value: ValidWaybillRow }
  | { ok: false; errors: string[] };

export type WaybillBatchPlan = {
  valid: ValidWaybillRow[];
  skipped: { rowNumber: number; reason: string }[];
  total: number;
};

/** CSV 한 줄 분해(쌍따옴표/이스케이프 처리, 필드 내 개행 미지원). */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else cur += ch;
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

/** CSV → 원시 행 배열(헤더 기반, BOM 제거, 빈 줄 무시). */
export function parseWaybillCsv(csv: string): RawWaybillRow[] {
  const text = (csv ?? "").replace(/^﻿/, "");
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  const rows: RawWaybillRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: RawWaybillRow = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

/**
 * 단일 행 검증 — 주문번호 존재 + 택배사 유효 + 송장번호 형식.
 */
export function validateWaybillRow(row: RawWaybillRow): WaybillRowValidation {
  const errors: string[] = [];
  const orderRef = (row["주문번호"] ?? "").trim();
  const carrierCode = (row["택배사"] ?? "").trim();
  const trackingNumber = normalizeTrackingNumber(row["송장번호"] ?? "");

  if (!orderRef) errors.push("주문번호 누락");

  if (!carrierCode) {
    errors.push("택배사 누락");
  } else if (!isKnownCarrier(carrierCode)) {
    errors.push(`알 수 없는 택배사: ${carrierCode}`);
  }

  // 택배사가 유효할 때만 송장 형식 검증(이중 오류 방지)
  if (carrierCode && isKnownCarrier(carrierCode)) {
    const tv = validateTrackingNumber(carrierCode, trackingNumber);
    if (!tv.valid) errors.push(tv.error ?? "송장번호 형식 오류");
  } else if (!trackingNumber) {
    errors.push("송장번호 누락");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { orderRef, carrierCode, trackingNumber } };
}

/**
 * 일괄 발송 계획 (부분 성공 — 실패 행 skip + 리포트)
 * - rowNumber 는 데이터 행 기준 1부터(헤더 제외).
 */
export function buildWaybillBatchPlan(rows: RawWaybillRow[]): WaybillBatchPlan {
  const valid: ValidWaybillRow[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];
  rows.forEach((row, idx) => {
    const r = validateWaybillRow(row);
    if (r.ok) valid.push(r.value);
    else skipped.push({ rowNumber: idx + 1, reason: r.errors.join(", ") });
  });
  return { valid, skipped, total: rows.length };
}

/** CSV 셀 이스케이프 */
function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** 일괄 등록 빈 템플릿 CSV(BOM + 헤더 + 예시). */
export function waybillTemplateCsv(): string {
  const header = WAYBILL_COLUMNS.map(escapeCsvCell).join(",");
  const example = ["1", "cj", "1234567890"].map(escapeCsvCell).join(",");
  return "﻿" + [header, example].join("\n");
}
