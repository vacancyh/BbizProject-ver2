/**
 * 단위 테스트 — t002_지역세금 (unit_059)
 *
 * production 코드 import: @/lib/settings/region-tax-logic (복제 없음)
 * 호출처: apps/admin/src/app/(admin)/settings/page.tsx 의 RegionTaxTab 이
 *   validateTaxRateInput / validateRegionNameInput / KOREA_VAT_RATE 를 실제 호출.
 *
 * UT-001: region 조회 + tax-rate 설정/오버라이드 — 세율 반영(VAT 10% 기본)
 */

import { describe, it, expect } from "vitest";
import {
  validateTaxRateInput,
  validateRegionNameInput,
  isDefaultRegionDeletable,
  hasKoreaVatRate,
  KOREA_VAT_RATE,
  DEFAULT_COUNTRY_CODE,
} from "../region-tax-logic";

// ─── UT-001: region 조회 + tax-rate 설정/오버라이드 — 세율 반영(VAT 10%) ─────

describe("UT-001 지역·세금 — tax-rate 검증 + 한국 VAT 10% (unit_059)", () => {
  // ── 상수 ─────────────────────────────────────────────────────────────────

  describe("상수 — 한국 VAT 기본값", () => {
    it("KOREA_VAT_RATE = 10", () => {
      expect(KOREA_VAT_RATE).toBe(10);
    });

    it("DEFAULT_COUNTRY_CODE = KR", () => {
      expect(DEFAULT_COUNTRY_CODE).toBe("KR");
    });
  });

  // ── I1: 세율 0~100 검증 (spec §4 I1) ──────────────────────────────────

  describe("I1: 세율 0~100 필수 (spec §4)", () => {
    it("정상 세율(0) → 오류 없음", () => {
      const errs = validateTaxRateInput({ rate: 0 });
      expect(errs.length).toBe(0);
    });

    it("정상 세율(10, 한국 VAT) → 오류 없음", () => {
      const errs = validateTaxRateInput({ rate: 10 });
      expect(errs.length).toBe(0);
    });

    it("정상 세율(100) → 오류 없음", () => {
      const errs = validateTaxRateInput({ rate: 100 });
      expect(errs.length).toBe(0);
    });

    it("음수 세율(-1) → 오류 반환", () => {
      const errs = validateTaxRateInput({ rate: -1 });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("rate");
      expect(errs[0].message).toBe("세율 오류");
    });

    it("100 초과 세율(101) → 오류 반환", () => {
      const errs = validateTaxRateInput({ rate: 101 });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("rate");
      expect(errs[0].message).toBe("세율 오류");
    });

    it("문자열 정상 세율('10') → 오류 없음", () => {
      const errs = validateTaxRateInput({ rate: "10" });
      expect(errs.length).toBe(0);
    });

    it("문자열 비정상('abc') → 오류 반환", () => {
      const errs = validateTaxRateInput({ rate: "abc" });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("rate");
    });

    it("소수점 세율(7.5) → 오류 없음", () => {
      const errs = validateTaxRateInput({ rate: 7.5 });
      expect(errs.length).toBe(0);
    });
  });

  // ── I2: 지역명 1~50자 검증 (spec §4 I2) ───────────────────────────────

  describe("I2: 지역명 1~50자 필수 (spec §4)", () => {
    it("빈 이름 → 오류 반환", () => {
      const errs = validateRegionNameInput("");
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("name");
      expect(errs[0].message).toBe("지역명 필수");
    });

    it("공백만인 이름 → 오류 반환", () => {
      const errs = validateRegionNameInput("   ");
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("name");
    });

    it("정상 이름(1자) → 오류 없음", () => {
      const errs = validateRegionNameInput("한");
      expect(errs.length).toBe(0);
    });

    it("정상 이름(50자) → 오류 없음", () => {
      const errs = validateRegionNameInput("가".repeat(50));
      expect(errs.length).toBe(0);
    });

    it("51자 이름 → 오류 반환", () => {
      const errs = validateRegionNameInput("A".repeat(51));
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("name");
    });
  });

  // ── 기본 region 삭제 금지 (spec §3 S1) ───────────────────────────────

  describe("기본 region 삭제 금지 — isDefaultRegionDeletable (spec §3)", () => {
    it("기본 region 삭제 시도 → false", () => {
      expect(isDefaultRegionDeletable("region-kr", ["region-kr"], "region-kr")).toBe(false);
    });

    it("기본 region 외 삭제 → true", () => {
      expect(isDefaultRegionDeletable("region-jp", ["region-kr", "region-jp"], "region-kr")).toBe(true);
    });
  });

  // ── 한국 VAT 10% 기본 세율 설정 확인 ─────────────────────────────────

  describe("hasKoreaVatRate — VAT 10% 기본 반영 (spec UT-001)", () => {
    it("VAT 10% 세율 존재 → true", () => {
      expect(hasKoreaVatRate([{ rate: 10 }])).toBe(true);
    });

    it("VAT 10% 외 세율만 → false", () => {
      expect(hasKoreaVatRate([{ rate: 5 }, { rate: 7 }])).toBe(false);
    });

    it("빈 세율 목록 → false", () => {
      expect(hasKoreaVatRate([])).toBe(false);
    });

    it("null 세율 포함 목록, VAT 없음 → false", () => {
      expect(hasKoreaVatRate([{ rate: null }])).toBe(false);
    });

    it("null 세율 + VAT 10% 혼합 → true", () => {
      expect(hasKoreaVatRate([{ rate: null }, { rate: 10 }])).toBe(true);
    });
  });
});
