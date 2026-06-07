/**
 * biz-no-logic 단위 테스트 (d5 t007_세금계산서)
 * spec: dag/d5_회원관리/t007_세금계산서.md §9 — 사업자번호 검증 + 상태 전이
 *
 * 유효 샘플 1234567891 (체크섬 계산값) / 무효 1234567890.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeBizNo,
  validateBizNo,
  canTransitionTaxInvoice,
} from "./biz-no-logic";

describe("normalizeBizNo", () => {
  it("하이픈/공백 제거", () => {
    expect(normalizeBizNo("123-45-67891")).toBe("1234567891");
    expect(normalizeBizNo(" 123 456 7891 ")).toBe("1234567891");
  });
});

describe("validateBizNo (체크디짓)", () => {
  it("유효 번호 통과", () => {
    expect(validateBizNo("1234567891").valid).toBe(true);
    expect(validateBizNo("123-45-67891").valid).toBe(true); // 하이픈 포함도 정규화 후 통과
  });
  it("체크디짓 불일치 거부", () => {
    const r = validateBizNo("1234567890");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("체크디짓");
  });
  it("자릿수 오류 거부", () => {
    expect(validateBizNo("12345").valid).toBe(false);
    expect(validateBizNo("12345678901").valid).toBe(false);
  });
  it("빈값 거부", () => {
    expect(validateBizNo("").valid).toBe(false);
  });
});

describe("canTransitionTaxInvoice (상태 전이)", () => {
  it("신청→발급 허용", () => {
    expect(canTransitionTaxInvoice("pending", "issued")).toBe(true);
  });
  it("발급→정정/취소 허용", () => {
    expect(canTransitionTaxInvoice("issued", "amended")).toBe(true);
    expect(canTransitionTaxInvoice("issued", "cancelled")).toBe(true);
  });
  it("취소→어떤 전이도 불가", () => {
    expect(canTransitionTaxInvoice("cancelled", "issued")).toBe(false);
    expect(canTransitionTaxInvoice("cancelled", "amended")).toBe(false);
  });
  it("신청→취소 직접 전이 불가(발급 후만 취소)", () => {
    expect(canTransitionTaxInvoice("pending", "cancelled")).toBe(false);
  });
});
