/**
 * slug-cache 단위 테스트 (d4 t006_slug검증캐시 — UT-002 캐시 무효화)
 *
 * spec: dag/d4_카테고리/t006_slug검증캐시.md §9 / unit_test/unit_029_slug검증캐시.md
 *  - UT-002: 변경 시 캐시 무효화 → 변경 후 옛 slug 캐시 miss, 새 slug 반영
 * production 함수 직접 import — slug 변경 핸들러가 호출하는 캐시 무효화 함수.
 */
import { describe, it, expect } from "vitest";
import { createSlugCache } from "./slug-cache";

describe("createSlugCache 기본 동작", () => {
  it("set/get/has", () => {
    const c = createSlugCache<{ id: string }>();
    c.set("shirt", { id: "p1" });
    expect(c.get("shirt")).toEqual({ id: "p1" });
    expect(c.has("shirt")).toBe(true);
    expect(c.get("missing")).toBeUndefined();
    expect(c.size).toBe(1);
  });

  it("키는 대소문자/공백 무시 정규화", () => {
    const c = createSlugCache<number>();
    c.set("  Shirt ", 1);
    expect(c.get("shirt")).toBe(1);
    expect(c.has("SHIRT")).toBe(true);
  });

  it("invalidate / invalidateAll", () => {
    const c = createSlugCache<number>();
    c.set("a", 1);
    c.set("b", 2);
    expect(c.invalidate("a")).toBe(true);
    expect(c.has("a")).toBe(false);
    expect(c.size).toBe(1);
    c.invalidateAll();
    expect(c.size).toBe(0);
  });
});

describe("invalidateOnChange (UT-002 변경 시 무효화)", () => {
  it("slug 변경 후 옛 slug 는 miss, 새 slug 로 값 이전", () => {
    const c = createSlugCache<{ id: string }>();
    c.set("old-slug", { id: "cat1" });

    c.invalidateOnChange("old-slug", "new-slug");

    // 옛 slug 는 반드시 무효화(stale 제거)
    expect(c.get("old-slug")).toBeUndefined();
    expect(c.has("old-slug")).toBe(false);
    // 새 slug 로 값 재적재
    expect(c.get("new-slug")).toEqual({ id: "cat1" });
  });

  it("새 값 명시 시 그 값으로 재적재", () => {
    const c = createSlugCache<{ id: string; title: string }>();
    c.set("old", { id: "c1", title: "옛제목" });
    c.invalidateOnChange("old", "new", { id: "c1", title: "새제목" });
    expect(c.get("new")).toEqual({ id: "c1", title: "새제목" });
    expect(c.get("old")).toBeUndefined();
  });

  it("옛 slug 에 캐시가 없으면 새 slug 도 비워둠(no-op 안전)", () => {
    const c = createSlugCache<number>();
    c.invalidateOnChange("ghost", "new");
    expect(c.has("new")).toBe(false);
    expect(c.size).toBe(0);
  });

  it("동일 slug 변경(값 갱신)도 stale 잔존 없이 1건", () => {
    const c = createSlugCache<number>();
    c.set("same", 1);
    c.invalidateOnChange("same", "same", 2);
    expect(c.get("same")).toBe(2);
    expect(c.size).toBe(1);
  });
});
