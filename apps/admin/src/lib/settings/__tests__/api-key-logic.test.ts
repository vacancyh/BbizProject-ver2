/**
 * 단위 테스트 — t004_API연동키 (unit_061)
 *
 * production 코드 import: @/lib/settings/api-key-logic (복제 없음)
 * 호출처 grep 근거:
 *   apps/admin/src/app/(admin)/api-keys/page.tsx:
 *     - validateApiKeyInput  → handleCreate() 저장 전 검증
 *     - maskToken            → TokenRevealModal 토큰 표시
 *     - isRevoked            → 목록 행 revoked 상태 판단
 *     - apiKeyTypeLabel      → 타입 배지/버튼 레이블
 *
 * UT-001: 키 발급(1회 노출) + 폐기 + 채널 연결 — unit_061
 */

import { describe, it, expect } from "vitest";
import {
  validateApiKeyInput,
  maskToken,
  isRevoked,
  apiKeyTypeLabel,
} from "../api-key-logic";

// ─── UT-001: API 키 발급(1회 노출) + 폐기 + 채널 연결 (unit_061) ──────────────

describe("UT-001 API 키 — 입력 검증 + 토큰 마스킹 + 폐기 상태 + 타입 레이블 (unit_061)", () => {
  // ── I1: 키 종류 검증 (spec §4) ────────────────────────────────────────────

  describe("I1: 키 종류 publishable | secret 검증 (spec §4)", () => {
    it("publishable → 오류 없음", () => {
      const errs = validateApiKeyInput({ type: "publishable", title: "테스트키" });
      expect(errs.filter((e) => e.field === "type")).toHaveLength(0);
    });

    it("secret → 오류 없음", () => {
      const errs = validateApiKeyInput({ type: "secret", title: "테스트키" });
      expect(errs.filter((e) => e.field === "type")).toHaveLength(0);
    });

    it("잘못된 종류 → type 오류", () => {
      const errs = validateApiKeyInput({ type: "unknown", title: "테스트키" });
      expect(errs.some((e) => e.field === "type")).toBe(true);
      expect(errs.find((e) => e.field === "type")?.message).toBe("종류 오류");
    });

    it("빈 종류 → type 오류", () => {
      const errs = validateApiKeyInput({ type: "", title: "테스트키" });
      expect(errs.some((e) => e.field === "type")).toBe(true);
    });
  });

  // ── I2: 제목 검증 (spec §4) ───────────────────────────────────────────────

  describe("I2: 제목 1~50자 필수 (spec §4)", () => {
    it("빈 제목 → title 오류", () => {
      const errs = validateApiKeyInput({ type: "publishable", title: "" });
      expect(errs.some((e) => e.field === "title")).toBe(true);
      expect(errs.find((e) => e.field === "title")?.message).toBe("제목 필수");
    });

    it("공백만인 제목 → title 오류", () => {
      const errs = validateApiKeyInput({ type: "publishable", title: "   " });
      expect(errs.some((e) => e.field === "title")).toBe(true);
    });

    it("정상 제목(1자) → 오류 없음", () => {
      const errs = validateApiKeyInput({ type: "publishable", title: "A" });
      expect(errs.filter((e) => e.field === "title")).toHaveLength(0);
    });

    it("정상 제목(50자) → 오류 없음", () => {
      const errs = validateApiKeyInput({
        type: "publishable",
        title: "가".repeat(50),
      });
      expect(errs.filter((e) => e.field === "title")).toHaveLength(0);
    });

    it("51자 제목 → title 오류", () => {
      const errs = validateApiKeyInput({
        type: "publishable",
        title: "A".repeat(51),
      });
      expect(errs.some((e) => e.field === "title")).toBe(true);
    });
  });

  // ── 토큰 마스킹 — spec §8 C1: 생성 후 이후 마스킹 ───────────────────────

  describe("토큰 마스킹 — maskToken (spec §8 C1)", () => {
    it("평문 토큰 → 앞 8자 + **** 마스킹", () => {
      const result = maskToken("sk_live_abcdefghijklmn");
      expect(result.startsWith("sk_live_")).toBe(true);
      expect(result.endsWith("****")).toBe(true);
    });

    it("이미 마스킹된 redacted 토큰 → 그대로 반환", () => {
      const masked = "sk_****";
      expect(maskToken(masked)).toBe(masked);
    });

    it("빈 토큰 → ****", () => {
      expect(maskToken("")).toBe("****");
    });

    it("8자 미만 토큰 → 전부 보이고 **** 추가", () => {
      const result = maskToken("abc");
      expect(result.includes("abc")).toBe(true);
      expect(result.endsWith("****")).toBe(true);
    });
  });

  // ── 폐기 상태 확인 — spec §5 A2 ──────────────────────────────────────────

  describe("폐기 상태 — isRevoked (spec §5 A2)", () => {
    it("revoked_at null → 폐기 안 됨(false)", () => {
      expect(isRevoked(null)).toBe(false);
    });

    it("revoked_at 문자열 → 폐기됨(true)", () => {
      expect(isRevoked("2026-06-03T00:00:00.000Z")).toBe(true);
    });
  });

  // ── 타입 레이블 반환 ──────────────────────────────────────────────────────

  describe("타입 레이블 — apiKeyTypeLabel", () => {
    it("publishable → 'Publishable'", () => {
      expect(apiKeyTypeLabel("publishable")).toBe("Publishable");
    });

    it("secret → 'Secret'", () => {
      expect(apiKeyTypeLabel("secret")).toBe("Secret");
    });
  });
});
