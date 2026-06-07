/**
 * 단위 테스트 — t001_스토어설정 (unit_058)
 *
 * production 코드 import: @/lib/settings/store-logic (복제 없음)
 * 호출처: apps/admin/src/app/(admin)/settings/page.tsx 의 doSave() 가 validateStoreInput 을 실제 호출.
 *
 * UT-001: store 조회/수정 + 통화/로케일 추가 — 갱신 반영 + 기본통화 보존
 */

import { describe, it, expect } from "vitest";
import {
  validateStoreInput,
  isDefaultCurrencyPreserved,
  mergeCurrencies,
  mergeLocales,
} from "../store-logic";

// ─── UT-001: store 조회/수정 + 통화/로케일 추가 — 갱신 반영 + 기본통화 보존 ───

describe("UT-001 스토어 설정 — 입력 검증 + 기본통화 보존 + 통화/로케일 추가 (unit_058)", () => {
  // ── I1: 스토어명 검증 ──────────────────────────────────────────────────────

  describe("I1: 스토어명 1~100자 필수 (spec §4)", () => {
    it("빈 이름 → 오류 반환", () => {
      const errs = validateStoreInput({ name: "" });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("name");
      expect(errs[0].message).toBe("이름 필수");
    });

    it("공백만인 이름 → 오류 반환", () => {
      const errs = validateStoreInput({ name: "   " });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("name");
    });

    it("정상 이름(1자) → 오류 없음", () => {
      const errs = validateStoreInput({ name: "A" });
      expect(errs.length).toBe(0);
    });

    it("정상 이름(100자) → 오류 없음", () => {
      const errs = validateStoreInput({ name: "가".repeat(100) });
      expect(errs.length).toBe(0);
    });

    it("101자 이름 → 오류 반환", () => {
      const errs = validateStoreInput({ name: "A".repeat(101) });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("name");
    });
  });

  // ── I2: 기본통화 지원통화 포함 검증 ──────────────────────────────────────

  describe("I2: 기본통화 지원통화 포함 (spec §4)", () => {
    it("기본통화가 지원통화에 없으면 오류", () => {
      const errs = validateStoreInput({
        name: "테스트스토어",
        default_currency_code: "USD",
        supported_currency_codes: ["KRW", "JPY"],
      });
      expect(errs.some((e) => e.field === "default_currency_code")).toBe(true);
      expect(errs[0].message).toBe("통화 오류");
    });

    it("기본통화가 지원통화에 있으면 오류 없음", () => {
      const errs = validateStoreInput({
        name: "테스트스토어",
        default_currency_code: "KRW",
        supported_currency_codes: ["KRW", "USD"],
      });
      expect(errs.length).toBe(0);
    });

    it("대소문자 무관 일치 허용", () => {
      const errs = validateStoreInput({
        name: "테스트스토어",
        default_currency_code: "krw",
        supported_currency_codes: ["KRW"],
      });
      expect(errs.length).toBe(0);
    });
  });

  // ── 기본통화 보존 (spec §3 S1: 기본통화 삭제 금지) ──────────────────────

  describe("기본통화 보존 — isDefaultCurrencyPreserved (spec §3)", () => {
    it("KRW 가 새 목록에 있으면 true", () => {
      expect(isDefaultCurrencyPreserved("KRW", ["KRW", "USD"])).toBe(true);
    });

    it("KRW 가 새 목록에 없으면 false", () => {
      expect(isDefaultCurrencyPreserved("KRW", ["USD", "JPY"])).toBe(false);
    });

    it("빈 목록이면 false", () => {
      expect(isDefaultCurrencyPreserved("KRW", [])).toBe(false);
    });

    it("대소문자 무관", () => {
      expect(isDefaultCurrencyPreserved("KRW", ["krw"])).toBe(true);
    });
  });

  // ── 통화 추가 — mergeCurrencies (spec §5 A2) ──────────────────────────────

  describe("통화 추가 — mergeCurrencies (spec §5 A2)", () => {
    it("신규 통화 추가 후 기존 통화 보존됨", () => {
      const result = mergeCurrencies(["KRW"], ["USD", "JPY"]);
      expect(result).toContain("krw");
      expect(result).toContain("usd");
      expect(result).toContain("jpy");
    });

    it("중복 추가 시 한 번만 포함", () => {
      const result = mergeCurrencies(["KRW", "USD"], ["USD", "EUR"]);
      const usdCount = result.filter((c) => c === "usd").length;
      expect(usdCount).toBe(1);
    });

    it("빈 기존 목록 + 신규 추가", () => {
      const result = mergeCurrencies([], ["KRW"]);
      expect(result).toContain("krw");
    });
  });

  // ── 로케일 추가 — mergeLocales (spec: add-locales) ────────────────────────

  describe("로케일 추가 — mergeLocales", () => {
    it("신규 로케일 추가 후 기존 보존됨", () => {
      const result = mergeLocales(["ko"], ["en", "ja"]);
      expect(result).toContain("ko");
      expect(result).toContain("en");
      expect(result).toContain("ja");
    });

    it("중복 로케일은 한 번만 포함", () => {
      const result = mergeLocales(["ko", "en"], ["en", "zh"]);
      const enCount = result.filter((l) => l === "en").length;
      expect(enCount).toBe(1);
    });

    it("빈 기존 목록 + 신규 추가", () => {
      const result = mergeLocales([], ["ko"]);
      expect(result).toContain("ko");
    });
  });
});
