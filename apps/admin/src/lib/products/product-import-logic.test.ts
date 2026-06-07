/**
 * product-import-logic 단위 테스트 (d3 t004_상품일괄가져오기)
 *
 * spec: dag/d3_상품관리/t004_상품일괄가져오기.md §9 / unit_test/unit_017_상품일괄가져오기.md
 *  - UT-001: CSV import(부분 성공) → 실패 행 skip + 리포트
 *  - UT-002: export 템플릿 → 빈 템플릿 CSV
 * production 함수 직접 import — page.tsx import 핸들러 정합 함수.
 */
import { describe, it, expect } from "vitest";
import {
  parseProductCsv,
  validateImportRow,
  buildImportPlan,
  importTemplateCsv,
  IMPORT_COLUMNS,
} from "./product-import-logic";

describe("parseProductCsv", () => {
  it("헤더 기반 행 매핑", () => {
    const csv = "상품명,가격,통화,상태,handle\n셔츠,10000,krw,published,shirt";
    const rows = parseProductCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]["상품명"]).toBe("셔츠");
    expect(rows[0]["가격"]).toBe("10000");
    expect(rows[0]["통화"]).toBe("krw");
  });

  it("UTF-8 BOM 제거 + 빈 줄 무시 + CRLF 처리", () => {
    const csv = "﻿상품명,가격,통화\r\n셔츠,10000,krw\r\n\r\n바지,20000,krw\r\n";
    const rows = parseProductCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1]["상품명"]).toBe("바지");
  });

  it("쌍따옴표 내 콤마/이스케이프 처리", () => {
    const csv = '상품명,가격,통화\n"콤마,있는 상품",10000,krw\n"따옴표""상품",20000,krw';
    const rows = parseProductCsv(csv);
    expect(rows[0]["상품명"]).toBe("콤마,있는 상품");
    expect(rows[1]["상품명"]).toBe('따옴표"상품');
  });

  it("데이터 행 없으면 빈 배열", () => {
    expect(parseProductCsv("상품명,가격,통화")).toEqual([]);
    expect(parseProductCsv("")).toEqual([]);
  });
});

describe("validateImportRow", () => {
  it("정상 행 통과 + 값 매핑", () => {
    const r = validateImportRow({ 상품명: "셔츠", 가격: "10000", 통화: "KRW", 상태: "published", handle: "shirt" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe("셔츠");
      expect(r.value.amount).toBe(10000);
      expect(r.value.currency_code).toBe("krw"); // 소문자 정규화
      expect(r.value.status).toBe("published");
      expect(r.value.handle).toBe("shirt");
    }
  });

  it("상품명 누락 → 실패", () => {
    const r = validateImportRow({ 상품명: "", 가격: "10000", 통화: "krw" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("상품명 누락");
  });

  it("가격 비숫자 → 실패", () => {
    const r = validateImportRow({ 상품명: "셔츠", 가격: "abc", 통화: "krw" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("가격이 숫자가 아님");
  });

  it("가격 음수 → 실패", () => {
    const r = validateImportRow({ 상품명: "셔츠", 가격: "-100", 통화: "krw" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("가격이 음수");
  });

  it("통화 누락 → 실패", () => {
    const r = validateImportRow({ 상품명: "셔츠", 가격: "10000", 통화: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("통화 누락");
  });

  it("상태 미지정/비표준 → draft 안전 기본값", () => {
    const r = validateImportRow({ 상품명: "셔츠", 가격: "10000", 통화: "krw", 상태: "weird" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.status).toBe("draft");
  });
});

describe("buildImportPlan (UT-001 부분 성공)", () => {
  it("유효 행은 valid, 실패 행은 skipped 리포트", () => {
    const rows = parseProductCsv(
      [
        "상품명,가격,통화,상태",
        "셔츠,10000,krw,published", // ok
        ",20000,krw,published", // 상품명 누락
        "바지,abc,krw,draft", // 가격 비숫자
        "양말,3000,krw,draft", // ok
      ].join("\n")
    );
    const plan = buildImportPlan(rows);
    expect(plan.total).toBe(4);
    expect(plan.valid).toHaveLength(2);
    expect(plan.skipped).toHaveLength(2);
    expect(plan.skipped[0].rowNumber).toBe(2);
    expect(plan.skipped[1].rowNumber).toBe(3);
    expect(plan.valid.map((v) => v.title)).toEqual(["셔츠", "양말"]);
  });

  it("전부 실패 시 valid 0", () => {
    const plan = buildImportPlan([{ 상품명: "", 가격: "", 통화: "" }]);
    expect(plan.valid).toHaveLength(0);
    expect(plan.skipped).toHaveLength(1);
  });
});

describe("importTemplateCsv (UT-002)", () => {
  it("BOM + 헤더(전 컬럼) + 예시행", () => {
    const csv = importTemplateCsv();
    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.replace(/^﻿/, "").split("\n");
    for (const col of IMPORT_COLUMNS) expect(lines[0]).toContain(col);
    expect(lines).toHaveLength(2);
  });

  it("템플릿은 다시 파싱 가능(왕복 정합)", () => {
    const rows = parseProductCsv(importTemplateCsv());
    expect(rows).toHaveLength(1);
    const r = validateImportRow(rows[0]);
    expect(r.ok).toBe(true);
  });
});
