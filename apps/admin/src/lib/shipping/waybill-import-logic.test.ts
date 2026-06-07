/**
 * waybill-import-logic 단위 테스트 (d6 t004_운송장CSV일괄)
 * spec: dag/d6_배송관리/t004_운송장CSV일괄.md §9 — CSV 파싱/검증/부분성공
 */
import { describe, it, expect } from "vitest";
import {
  parseWaybillCsv,
  validateWaybillRow,
  buildWaybillBatchPlan,
  waybillTemplateCsv,
  WAYBILL_COLUMNS,
} from "./waybill-import-logic";

describe("parseWaybillCsv", () => {
  it("헤더 기반 행 매핑", () => {
    const csv = "주문번호,택배사,송장번호\n1,cj,1234567890";
    const rows = parseWaybillCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]["주문번호"]).toBe("1");
    expect(rows[0]["택배사"]).toBe("cj");
    expect(rows[0]["송장번호"]).toBe("1234567890");
  });
  it("BOM 제거 + 빈줄 무시 + CRLF", () => {
    const csv = "﻿주문번호,택배사,송장번호\r\n1,cj,1234567890\r\n\r\n2,epost,1234567890123\r\n";
    expect(parseWaybillCsv(csv)).toHaveLength(2);
  });
  it("데이터 없으면 빈 배열", () => {
    expect(parseWaybillCsv("주문번호,택배사,송장번호")).toEqual([]);
  });
});

describe("validateWaybillRow", () => {
  it("정상 행 통과 + 값 매핑", () => {
    const r = validateWaybillRow({ 주문번호: "1", 택배사: "cj", 송장번호: "123-456-7890" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.orderRef).toBe("1");
      expect(r.value.carrierCode).toBe("cj");
      expect(r.value.trackingNumber).toBe("1234567890"); // 정규화
    }
  });
  it("주문번호 누락 → 실패", () => {
    const r = validateWaybillRow({ 주문번호: "", 택배사: "cj", 송장번호: "1234567890" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("주문번호 누락");
  });
  it("미지 택배사 → 실패", () => {
    const r = validateWaybillRow({ 주문번호: "1", 택배사: "fedex", 송장번호: "1234567890" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("알 수 없는"))).toBe(true);
  });
  it("송장 형식 위반 → 실패", () => {
    const r = validateWaybillRow({ 주문번호: "1", 택배사: "epost", 송장번호: "12345" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.some((e) => e.includes("형식"))).toBe(true);
  });
});

describe("buildWaybillBatchPlan (부분 성공)", () => {
  it("유효/실패 행 분리 + 리포트", () => {
    const rows = parseWaybillCsv(
      [
        "주문번호,택배사,송장번호",
        "1,cj,1234567890", // ok
        ",cj,1234567890", // 주문번호 누락
        "3,fedex,1234567890", // 미지 택배사
        "4,epost,1234567890123", // ok
      ].join("\n")
    );
    const plan = buildWaybillBatchPlan(rows);
    expect(plan.total).toBe(4);
    expect(plan.valid).toHaveLength(2);
    expect(plan.skipped).toHaveLength(2);
    expect(plan.skipped[0].rowNumber).toBe(2);
    expect(plan.skipped[1].rowNumber).toBe(3);
    expect(plan.valid.map((v) => v.orderRef)).toEqual(["1", "4"]);
  });
});

describe("waybillTemplateCsv", () => {
  it("BOM + 헤더(전 컬럼) + 예시, 왕복 파싱 가능", () => {
    const csv = waybillTemplateCsv();
    expect(csv.startsWith("﻿")).toBe(true);
    for (const col of WAYBILL_COLUMNS) expect(csv).toContain(col);
    const rows = parseWaybillCsv(csv);
    expect(rows).toHaveLength(1);
    expect(validateWaybillRow(rows[0]).ok).toBe(true);
  });
});
