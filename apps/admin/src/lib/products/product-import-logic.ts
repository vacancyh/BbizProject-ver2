/**
 * 상품 일괄 가져오기 순수 로직 모듈 (d3 t004_상품일괄가져오기 spec §9)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/app/(admin)/products/page.tsx 의 import 핸들러가
 *   parseProductCsv → buildImportPlan 으로 유효 행만 추려 createProduct(코어) 반복 호출.
 *   export 버튼은 importTemplateCsv 로 빈 템플릿 다운로드.
 *
 * 코어 직접호출 원칙(§V0-5): 신규 백엔드 route 없음. 파싱·검증은 클라이언트 순수함수,
 * 실제 생성은 Medusa /admin/products(createProduct)로 행별 반복.
 *
 * UT-001: CSV import(부분 성공) → 실패 행 skip + 리포트
 * UT-002: export 템플릿 → 현재 상품 CSV/빈 템플릿 다운로드
 */

/** import 템플릿 컬럼 (한글 헤더) */
export const IMPORT_COLUMNS = ["상품명", "가격", "통화", "상태", "handle"] as const;

/** 파싱된 원시 행 (헤더 → 값 매핑) */
export type RawImportRow = Record<string, string>;

/** 검증 통과한 import 행 (createProduct 입력 정합) */
export type ValidImportRow = {
  title: string;
  amount: number;
  currency_code: string;
  status: "published" | "draft";
  handle?: string;
};

/** 행 검증 결과 */
export type ImportRowValidation =
  | { ok: true; value: ValidImportRow }
  | { ok: false; errors: string[] };

/** import 계획 — 유효 행 + 스킵된 행 리포트(부분 성공) */
export type ImportPlan = {
  valid: ValidImportRow[];
  skipped: { rowNumber: number; reason: string }[];
  total: number;
};

/**
 * CSV 한 줄을 셀 배열로 분해 (RFC4180 호환 — 쌍따옴표 내 콤마/이스케이프 "" 처리).
 * 필드 내 개행은 지원하지 않음(상품 import 표준 행 단위 가정).
 */
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
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

/**
 * CSV 문자열 → 원시 행 배열 파싱 (헤더 기반).
 * - 선행 UTF-8 BOM 제거
 * - 빈 줄 무시
 * - 첫 줄 = 헤더
 */
export function parseProductCsv(csv: string): RawImportRow[] {
  const text = csv.replace(/^﻿/, "");
  const lines = text
    .split(/\r\n|\n|\r/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const rows: RawImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: RawImportRow = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

/** 상태 문자열 정규화 — published/draft 외는 draft 로 강제(미게시 안전 기본값). */
function normalizeStatus(raw: string): "published" | "draft" {
  return raw.trim() === "published" ? "published" : "draft";
}

/**
 * 단일 행 검증 (UT-001 실패 행 식별)
 * - 상품명 필수
 * - 가격: 숫자 + 0 이상
 * - 통화 필수(소문자 3자리 권장, 비면 실패)
 */
export function validateImportRow(row: RawImportRow): ImportRowValidation {
  const errors: string[] = [];
  const title = (row["상품명"] ?? "").trim();
  const priceRaw = (row["가격"] ?? "").trim();
  const currency = (row["통화"] ?? "").trim().toLowerCase();
  const handle = (row["handle"] ?? "").trim();

  if (!title) errors.push("상품명 누락");

  const amount = Number(priceRaw);
  if (priceRaw === "" || Number.isNaN(amount)) {
    errors.push("가격이 숫자가 아님");
  } else if (amount < 0) {
    errors.push("가격이 음수");
  }

  if (!currency) errors.push("통화 누락");

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      title,
      amount,
      currency_code: currency,
      status: normalizeStatus(row["상태"] ?? ""),
      ...(handle ? { handle } : {}),
    },
  };
}

/**
 * import 계획 생성 (UT-001 부분 성공 — 실패 행 skip + 리포트)
 * - rowNumber 는 데이터 행 기준 1부터(헤더 제외).
 */
export function buildImportPlan(rows: RawImportRow[]): ImportPlan {
  const valid: ValidImportRow[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];

  rows.forEach((row, idx) => {
    const result = validateImportRow(row);
    if (result.ok) {
      valid.push(result.value);
    } else {
      skipped.push({ rowNumber: idx + 1, reason: result.errors.join(", ") });
    }
  });

  return { valid, skipped, total: rows.length };
}

/** CSV 셀 이스케이프 */
function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * import 빈 템플릿 CSV 생성 (UT-002 export 템플릿)
 * - UTF-8 BOM + 헤더 + 예시 행 1개
 */
export function importTemplateCsv(): string {
  const header = IMPORT_COLUMNS.map(escapeCsvCell).join(",");
  const example = ["예시상품", "10000", "krw", "draft", "example-product"]
    .map(escapeCsvCell)
    .join(",");
  return "﻿" + [header, example].join("\n");
}
