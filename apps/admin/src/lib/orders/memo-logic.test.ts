/**
 * memo-logic 단위 테스트 (t011 UT-001·UT-002)
 * spec: unit_013_내부메모.md
 */
import { describe, it, expect } from "vitest";
import { canDeleteMemo, isValidMemoContent } from "./memo-logic";

// ── canDeleteMemo ─────────────────────────────────────────────────────────────

describe("canDeleteMemo", () => {
  it("본인(작성자)이면 true", () => {
    expect(
      canDeleteMemo({ memoAuthorId: "u_1", requesterId: "u_1", requesterRole: "cs" })
    ).toBe(true);
  });

  it("SUPER 등급이면 본인 여부 무관하게 true", () => {
    expect(
      canDeleteMemo({ memoAuthorId: "u_2", requesterId: "u_super", requesterRole: "super" })
    ).toBe(true);
  });

  it("타인이고 SUPER 아니면 false", () => {
    expect(
      canDeleteMemo({ memoAuthorId: "u_1", requesterId: "u_2", requesterRole: "cs" })
    ).toBe(false);
  });

  it("memoAuthorId null이면 false(비정상 데이터)", () => {
    expect(
      canDeleteMemo({ memoAuthorId: null, requesterId: "u_1", requesterRole: null })
    ).toBe(false);
  });

  it("requesterId null이면 false(미인증)", () => {
    expect(
      canDeleteMemo({ memoAuthorId: "u_1", requesterId: null, requesterRole: null })
    ).toBe(false);
  });
});

// ── isValidMemoContent ────────────────────────────────────────────────────────

describe("isValidMemoContent", () => {
  it("0자(빈 문자열) = false", () => {
    expect(isValidMemoContent("")).toBe(false);
  });

  it("공백만 = false", () => {
    expect(isValidMemoContent("   ")).toBe(false);
  });

  it("1자 = true", () => {
    expect(isValidMemoContent("a")).toBe(true);
  });

  it("2000자 = true", () => {
    expect(isValidMemoContent("가".repeat(2000))).toBe(true);
  });

  it("2001자 = false", () => {
    expect(isValidMemoContent("가".repeat(2001))).toBe(false);
  });

  it("앞뒤 공백 포함 trim 후 2000자 이하 = true", () => {
    expect(isValidMemoContent("  " + "a".repeat(1999) + "  ")).toBe(true);
  });

  it("앞뒤 공백 포함 trim 후 2001자 = false", () => {
    expect(isValidMemoContent("  " + "a".repeat(2001) + "  ")).toBe(false);
  });
});
