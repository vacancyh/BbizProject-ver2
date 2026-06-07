/**
 * 단위 테스트 — t006_반품환불사유 (unit_063)
 *
 * production 코드 import: @/lib/settings/reasons-logic (복제 없음)
 * 호출처: apps/admin/src/app/(admin)/settings/reasons/page.tsx 가
 *   validateReturnReasonInput / validateRefundReasonInput / canDeleteReason 을 실제 호출.
 *
 * UT-001: 사유 CRUD + 사용중 삭제 차단 — 코드 유니크 + 사용중 삭제 거부
 */

import { describe, it, expect } from "vitest";
import {
  validateReturnReasonInput,
  validateRefundReasonInput,
  canDeleteReason,
} from "../reasons-logic";

// ─── UT-001: 사유 CRUD + 사용중 삭제 차단 ─────────────────────────────────

describe("UT-001 반품·환불 사유 — 입력 검증 + 사용중 삭제 차단 (unit_063)", () => {
  // ── I1: 반품 사유 코드(value) 검증 ─────────────────────────────────────────

  describe("I1-반품: 코드(value) 1~30자 필수 + 유니크 (spec §4)", () => {
    it("빈 코드 → 오류 반환", () => {
      const errs = validateReturnReasonInput({ value: "", label: "라벨" });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("value");
      expect(errs[0].message).toBe("코드 필수");
    });

    it("공백만인 코드 → 오류 반환", () => {
      const errs = validateReturnReasonInput({ value: "   ", label: "라벨" });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("value");
    });

    it("정상 코드(1자) → 오류 없음", () => {
      const errs = validateReturnReasonInput({ value: "A", label: "라벨" });
      expect(errs.length).toBe(0);
    });

    it("정상 코드(30자) → 오류 없음", () => {
      const errs = validateReturnReasonInput({ value: "A".repeat(30), label: "라벨" });
      expect(errs.length).toBe(0);
    });

    it("31자 코드 → 오류 반환", () => {
      const errs = validateReturnReasonInput({ value: "A".repeat(31), label: "라벨" });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("value");
      expect(errs[0].message).toBe("코드 30자 초과");
    });

    it("기존 코드와 중복 → 코드 중복 오류", () => {
      const errs = validateReturnReasonInput(
        { value: "DEFECT", label: "불량" },
        ["DEFECT", "MISSING"]
      );
      expect(errs.some((e) => e.field === "value" && e.message === "코드 중복")).toBe(true);
    });

    it("기존 코드와 대소문자만 다를 때 → 코드 중복 오류", () => {
      const errs = validateReturnReasonInput(
        { value: "defect", label: "불량" },
        ["DEFECT"]
      );
      expect(errs.some((e) => e.field === "value" && e.message === "코드 중복")).toBe(true);
    });

    it("기존 코드 없으면 중복 오류 없음", () => {
      const errs = validateReturnReasonInput({ value: "NEW_CODE", label: "새 사유" }, []);
      expect(errs.length).toBe(0);
    });
  });

  // ── I2: 반품 사유 라벨 검증 ───────────────────────────────────────────────

  describe("I2-반품: 라벨 1~50자 필수 (spec §4)", () => {
    it("빈 라벨 → 오류 반환", () => {
      const errs = validateReturnReasonInput({ value: "CODE", label: "" });
      expect(errs.some((e) => e.field === "label" && e.message === "라벨 필수")).toBe(true);
    });

    it("공백만인 라벨 → 오류 반환", () => {
      const errs = validateReturnReasonInput({ value: "CODE", label: "   " });
      expect(errs.some((e) => e.field === "label")).toBe(true);
    });

    it("정상 라벨(1자) → 오류 없음", () => {
      const errs = validateReturnReasonInput({ value: "CODE", label: "A" });
      expect(errs.length).toBe(0);
    });

    it("정상 라벨(50자) → 오류 없음", () => {
      const errs = validateReturnReasonInput({ value: "CODE", label: "가".repeat(50) });
      expect(errs.length).toBe(0);
    });

    it("51자 라벨 → 오류 반환", () => {
      const errs = validateReturnReasonInput({ value: "CODE", label: "가".repeat(51) });
      expect(errs.some((e) => e.field === "label" && e.message === "라벨 50자 초과")).toBe(true);
    });
  });

  // ── I1: 환불 사유 코드(code) 검증 ─────────────────────────────────────────

  describe("I1-환불: 코드(code) 1~30자 필수 + 유니크 (spec §4)", () => {
    it("빈 코드 → 오류 반환", () => {
      const errs = validateRefundReasonInput({ code: "", label: "라벨" });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("code");
      expect(errs[0].message).toBe("코드 필수");
    });

    it("정상 코드(1자) → 오류 없음", () => {
      const errs = validateRefundReasonInput({ code: "A", label: "라벨" });
      expect(errs.length).toBe(0);
    });

    it("30자 코드 → 오류 없음", () => {
      const errs = validateRefundReasonInput({ code: "A".repeat(30), label: "라벨" });
      expect(errs.length).toBe(0);
    });

    it("31자 코드 → 오류 반환", () => {
      const errs = validateRefundReasonInput({ code: "A".repeat(31), label: "라벨" });
      expect(errs.some((e) => e.field === "code" && e.message === "코드 30자 초과")).toBe(true);
    });

    it("기존 코드와 중복 → 코드 중복 오류", () => {
      const errs = validateRefundReasonInput(
        { code: "OVERCHARGE", label: "과다청구" },
        ["OVERCHARGE"]
      );
      expect(errs.some((e) => e.field === "code" && e.message === "코드 중복")).toBe(true);
    });

    it("대소문자 무관 중복 검증", () => {
      const errs = validateRefundReasonInput(
        { code: "overcharge", label: "과다청구" },
        ["OVERCHARGE"]
      );
      expect(errs.some((e) => e.field === "code" && e.message === "코드 중복")).toBe(true);
    });
  });

  // ── I2: 환불 사유 라벨 검증 ───────────────────────────────────────────────

  describe("I2-환불: 라벨 1~50자 필수 (spec §4)", () => {
    it("빈 라벨 → 오류 반환", () => {
      const errs = validateRefundReasonInput({ code: "CODE", label: "" });
      expect(errs.some((e) => e.field === "label" && e.message === "라벨 필수")).toBe(true);
    });

    it("50자 라벨 → 오류 없음", () => {
      const errs = validateRefundReasonInput({ code: "CODE", label: "가".repeat(50) });
      expect(errs.length).toBe(0);
    });

    it("51자 라벨 → 오류 반환", () => {
      const errs = validateRefundReasonInput({ code: "CODE", label: "가".repeat(51) });
      expect(errs.some((e) => e.field === "label" && e.message === "라벨 50자 초과")).toBe(true);
    });
  });

  // ── C1: 사용중 사유 삭제 차단 (spec §8 C1) ────────────────────────────────

  describe("C1: 사용중 코드 삭제 차단 — canDeleteReason (spec §8)", () => {
    it("사용중 코드 → 삭제 불가(false)", () => {
      expect(canDeleteReason("DEFECT", ["DEFECT", "MISSING"])).toBe(false);
    });

    it("사용중 코드 대소문자 무관 → 삭제 불가(false)", () => {
      expect(canDeleteReason("defect", ["DEFECT"])).toBe(false);
    });

    it("사용중 아닌 코드 → 삭제 가능(true)", () => {
      expect(canDeleteReason("OLD_CODE", ["DEFECT", "MISSING"])).toBe(true);
    });

    it("사용중 목록 비어있으면 → 삭제 가능(true)", () => {
      expect(canDeleteReason("ANY_CODE", [])).toBe(true);
    });
  });
});
