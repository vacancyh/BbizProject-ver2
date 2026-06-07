/**
 * waybill-logic 단위 테스트 (d6 t003_국내택배연동)
 * spec: dag/d6_배송관리/t003_국내택배연동.md §9 — 택배사/송장형식/추적URL
 */
import { describe, it, expect } from "vitest";
import {
  CARRIER_RULES,
  isKnownCarrier,
  normalizeTrackingNumber,
  validateTrackingNumber,
  buildTrackingUrl,
} from "./waybill-logic";

describe("CARRIER_RULES / isKnownCarrier", () => {
  it("KR_CARRIERS 코드 체계와 정합(cj/epost/hanjin/lotte/logen)", () => {
    expect(Object.keys(CARRIER_RULES).sort()).toEqual(
      ["cj", "epost", "hanjin", "logen", "lotte"].sort()
    );
  });
  it("알려진/미지 택배사 판정", () => {
    expect(isKnownCarrier("cj")).toBe(true);
    expect(isKnownCarrier("unknown")).toBe(false);
  });
});

describe("normalizeTrackingNumber", () => {
  it("하이픈/공백 제거", () => {
    expect(normalizeTrackingNumber("1234-5678-90")).toBe("1234567890");
    expect(normalizeTrackingNumber(" 123 456 ")).toBe("123456");
  });
});

describe("validateTrackingNumber (택배사별 형식)", () => {
  it("CJ 10/12자리 허용", () => {
    expect(validateTrackingNumber("cj", "1234567890").valid).toBe(true);
    expect(validateTrackingNumber("cj", "123456789012").valid).toBe(true);
    expect(validateTrackingNumber("cj", "12345").valid).toBe(false);
  });
  it("우체국 13자리", () => {
    expect(validateTrackingNumber("epost", "1234567890123").valid).toBe(true);
    expect(validateTrackingNumber("epost", "1234567890").valid).toBe(false);
  });
  it("롯데 12자리", () => {
    expect(validateTrackingNumber("lotte", "123456789012").valid).toBe(true);
    expect(validateTrackingNumber("lotte", "1234567890").valid).toBe(false);
  });
  it("로젠 11자리", () => {
    expect(validateTrackingNumber("logen", "12345678901").valid).toBe(true);
  });
  it("하이픈 포함 입력도 정규화 후 검증", () => {
    expect(validateTrackingNumber("cj", "123-456-7890").valid).toBe(true);
  });
  it("미지 택배사 거부", () => {
    const r = validateTrackingNumber("unknown", "1234567890");
    expect(r.valid).toBe(false);
    expect(r.error).toContain("알 수 없는");
  });
  it("빈 번호 거부", () => {
    expect(validateTrackingNumber("cj", "").valid).toBe(false);
  });
});

describe("buildTrackingUrl", () => {
  it("택배사별 추적 URL 생성({n} 치환)", () => {
    expect(buildTrackingUrl("cj", "1234567890")).toContain("1234567890");
    expect(buildTrackingUrl("cj", "1234567890")).toContain("cjlogistics");
    expect(buildTrackingUrl("epost", "1234567890123")).toContain("epost.go.kr");
  });
  it("미지 택배사/빈 번호는 null", () => {
    expect(buildTrackingUrl("unknown", "123")).toBeNull();
    expect(buildTrackingUrl("cj", "")).toBeNull();
  });
});
