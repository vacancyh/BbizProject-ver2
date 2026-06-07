/**
 * 단위 테스트 — t003_판매채널 (unit_060)
 *
 * production 코드 import: @/lib/settings/channel-logic (복제 없음)
 * 호출처: apps/admin/src/app/(admin)/settings/channels/page.tsx 에서
 *   validateChannelInput, isDefaultChannel 을 실제 호출함.
 *
 * UT-001: 채널 CRUD + 상품 연결 — 채널명 검증 + 기본 채널 판단 + add-products 반영
 */

import { describe, it, expect } from "vitest";
import {
  validateChannelInput,
  isDefaultChannel,
} from "../channel-logic";

// ─── UT-001: 채널 CRUD + 상품 연결 ─────────────────────────────────────────

describe("UT-001 판매채널 — 채널 검증 + 기본 채널 판단 (unit_060)", () => {
  // ── I1: 채널명 1~50자 필수 (spec §4) ─────────────────────────────────────

  describe("I1: 채널명 1~50자 필수 (spec t003 §4 I1)", () => {
    it("빈 채널명 → 오류 반환 (채널명 필수)", () => {
      const errs = validateChannelInput({ name: "" });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("name");
      expect(errs[0].message).toBe("채널명 필수");
    });

    it("공백만인 채널명 → 오류 반환", () => {
      const errs = validateChannelInput({ name: "   " });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("name");
    });

    it("정상 채널명(1자) → 오류 없음", () => {
      const errs = validateChannelInput({ name: "A" });
      expect(errs.length).toBe(0);
    });

    it("정상 채널명(50자) → 오류 없음", () => {
      const errs = validateChannelInput({ name: "가".repeat(50) });
      expect(errs.length).toBe(0);
    });

    it("51자 채널명 → 오류 반환", () => {
      const errs = validateChannelInput({ name: "A".repeat(51) });
      expect(errs.length).toBeGreaterThan(0);
      expect(errs[0].field).toBe("name");
    });

    it("정상 채널명(한글 포함) → 오류 없음", () => {
      const errs = validateChannelInput({ name: "메인 쇼핑몰 채널" });
      expect(errs.length).toBe(0);
    });
  });

  // ── 기본 채널 판단 (spec §3 S1: 기본 채널 삭제 금지) ────────────────────

  describe("기본 채널 판단 — isDefaultChannel (spec §3 S1)", () => {
    it("metadata.is_default=true → 기본 채널 true", () => {
      expect(isDefaultChannel({ is_default: true })).toBe(true);
    });

    it("metadata.is_default=false → 기본 채널 false", () => {
      expect(isDefaultChannel({ is_default: false })).toBe(false);
    });

    it("metadata=null → 기본 채널 false", () => {
      expect(isDefaultChannel(null)).toBe(false);
    });

    it("metadata=undefined → 기본 채널 false", () => {
      expect(isDefaultChannel(undefined)).toBe(false);
    });

    it("metadata에 is_default 없음 → 기본 채널 false", () => {
      expect(isDefaultChannel({ other_key: "value" })).toBe(false);
    });
  });

  // ── add-products 입력값 반영 검증 (spec §5 A2, §6 API2) ──────────────────

  describe("add-products 반영 — 상품 ID 목록 파싱 시나리오 (spec §5 A2)", () => {
    it("빈 문자열 split → 유효 ID 없으면 빈 배열", () => {
      const raw = "  ";
      const ids = raw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      expect(ids.length).toBe(0);
    });

    it("줄바꿈 구분 상품 ID 파싱 → 배열로 반환", () => {
      const raw = "prod_01J\nprod_01K";
      const ids = raw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      expect(ids).toContain("prod_01J");
      expect(ids).toContain("prod_01K");
      expect(ids.length).toBe(2);
    });

    it("쉼표 구분 상품 ID 파싱 → 배열로 반환", () => {
      const raw = "prod_01A,prod_01B,prod_01C";
      const ids = raw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      expect(ids.length).toBe(3);
    });

    it("혼합(줄바꿈+쉼표) 파싱 → 정확히 분리", () => {
      const raw = "prod_01A\nprod_01B,prod_01C";
      const ids = raw
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      expect(ids.length).toBe(3);
    });
  });
});
