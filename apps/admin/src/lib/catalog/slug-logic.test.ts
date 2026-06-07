/**
 * slug-logic 단위 테스트 (d4 t006_slug검증캐시 — UT-001 형식/중복)
 *
 * spec: dag/d4_카테고리/t006_slug검증캐시.md §9 / unit_test/unit_029_slug검증캐시.md
 *  - UT-001: slug 형식/중복 검증 → 형식 위반/중복 차단(422 상당)
 * production 함수 직접 import — categories/collections 저장 핸들러 정합 함수.
 */
import { describe, it, expect } from "vitest";
import {
  normalizeSlug,
  validateSlugFormat,
  validateSlugLength,
  validateSlug,
  isDuplicateSlug,
  validateSlugForSave,
} from "./slug-logic";

describe("normalizeSlug", () => {
  it("영문 소문자/하이픈 정규화", () => {
    expect(normalizeSlug("Hello World")).toBe("hello-world");
    expect(normalizeSlug("  Multiple   Spaces  ")).toBe("multiple-spaces");
    expect(normalizeSlug("UPPER_case-Mix")).toBe("upper-case-mix");
  });

  it("선/후행 하이픈 제거", () => {
    expect(normalizeSlug("--edge--")).toBe("edge");
  });

  it("한글 등 전부 제거 시 timestamp 폴백(slug- 접두)", () => {
    expect(normalizeSlug("한글상품").startsWith("slug-")).toBe(true);
  });
});

describe("validateSlugFormat", () => {
  it("유효 slug 통과", () => {
    for (const s of ["abc", "a1", "hello-world", "x-2-y", "product-123"]) {
      expect(validateSlugFormat(s)).toBe(true);
    }
  });

  it("무효 slug 거부", () => {
    for (const s of [
      "Abc", // 대문자
      "hello world", // 공백
      "-lead", // 선행 하이픈
      "trail-", // 후행 하이픈
      "double--hyphen", // 연속 하이픈
      "특수", // 한글
      "a_b", // 언더스코어
      "", // 빈값
    ]) {
      expect(validateSlugFormat(s)).toBe(false);
    }
  });
});

describe("validateSlugLength", () => {
  it("기본 범위(2~128)", () => {
    expect(validateSlugLength("a")).toBe(false);
    expect(validateSlugLength("ab")).toBe(true);
    expect(validateSlugLength("a".repeat(128))).toBe(true);
    expect(validateSlugLength("a".repeat(129))).toBe(false);
  });
});

describe("validateSlug (종합)", () => {
  it("정상 slug → valid", () => {
    const r = validateSlug("hello-world");
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("빈값 → 단일 비어있음 오류", () => {
    const r = validateSlug("  ");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain("비어");
  });

  it("형식 위반 → 형식 오류 포함", () => {
    const r = validateSlug("Bad Slug");
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("형식"))).toBe(true);
  });

  it("1자 → 길이 오류", () => {
    const r = validateSlug("a");
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("길이"))).toBe(true);
  });
});

describe("isDuplicateSlug", () => {
  it("기존 목록에 있으면 중복", () => {
    expect(isDuplicateSlug("shirt", ["pants", "shirt", "socks"])).toBe(true);
  });

  it("대소문자 무시 비교", () => {
    expect(isDuplicateSlug("Shirt", ["shirt"])).toBe(true);
  });

  it("없으면 비중복", () => {
    expect(isDuplicateSlug("hat", ["shirt", "pants"])).toBe(false);
  });

  it("자기 자신(selfHandle)은 중복 제외", () => {
    // 수정 시 handle 그대로 두면 중복 아님
    expect(isDuplicateSlug("shirt", ["shirt", "pants"], "shirt")).toBe(false);
    // 다른 항목과 충돌하면 중복
    expect(isDuplicateSlug("pants", ["shirt", "pants"], "shirt")).toBe(true);
  });
});

describe("validateSlugForSave (형식+중복 통합, UT-001 차단)", () => {
  it("형식 정상 + 비중복 → valid", () => {
    expect(validateSlugForSave("new-cat", ["old-cat"]).valid).toBe(true);
  });

  it("중복이면 차단 + 사유", () => {
    const r = validateSlugForSave("old-cat", ["old-cat"]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("사용 중"))).toBe(true);
  });

  it("형식 위반이면 중복 검사 전에 차단", () => {
    const r = validateSlugForSave("Bad Slug", ["bad slug"]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("형식"))).toBe(true);
  });

  it("수정 시 자기 handle 유지는 통과", () => {
    expect(validateSlugForSave("my-cat", ["my-cat", "other"], "my-cat").valid).toBe(true);
  });
});
