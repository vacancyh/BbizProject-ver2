/**
 * sanction-logic 단위 테스트 (d5 t006_제재블랙리스트)
 * spec: dag/d5_회원관리/t006_제재블랙리스트.md §9 — 단계전이/활성/로그인차단
 */
import { describe, it, expect } from "vitest";
import {
  SANCTION_LEVELS,
  sanctionDurationDays,
  getNextSanctionLevel,
  calcSanctionUntil,
  isSanctionActive,
  shouldBlockLogin,
} from "./sanction-logic";

describe("sanctionDurationDays", () => {
  it("단계별 기간", () => {
    expect(sanctionDurationDays("warn")).toBe(0);
    expect(sanctionDurationDays("seven_days")).toBe(7);
    expect(sanctionDurationDays("thirty_days")).toBe(30);
    expect(sanctionDurationDays("permanent")).toBeNull();
  });
});

describe("getNextSanctionLevel (경고→7→30→영구)", () => {
  it("단계 상승", () => {
    expect(getNextSanctionLevel("warn")).toBe("seven_days");
    expect(getNextSanctionLevel("seven_days")).toBe("thirty_days");
    expect(getNextSanctionLevel("thirty_days")).toBe("permanent");
  });
  it("영구에서 더 안 올라감", () => {
    expect(getNextSanctionLevel("permanent")).toBe("permanent");
  });
  it("전체 순서 일관", () => {
    expect(SANCTION_LEVELS).toEqual(["warn", "seven_days", "thirty_days", "permanent"]);
  });
});

describe("calcSanctionUntil", () => {
  it("7일 제재 만료일", () => {
    expect(calcSanctionUntil("seven_days", "2026-06-01T00:00:00.000Z")).toBe(
      "2026-06-08T00:00:00.000Z"
    );
  });
  it("30일 제재 만료일", () => {
    expect(calcSanctionUntil("thirty_days", "2026-06-01T00:00:00.000Z")).toBe(
      "2026-07-01T00:00:00.000Z"
    );
  });
  it("영구는 null", () => {
    expect(calcSanctionUntil("permanent", "2026-06-01T00:00:00.000Z")).toBeNull();
  });
});

describe("isSanctionActive", () => {
  it("기간제 — until 이전 활성", () => {
    expect(
      isSanctionActive("seven_days", "2026-06-08T00:00:00.000Z", "2026-06-05T00:00:00.000Z")
    ).toBe(true);
  });
  it("기간제 — until 경과 비활성", () => {
    expect(
      isSanctionActive("seven_days", "2026-06-08T00:00:00.000Z", "2026-06-09T00:00:00.000Z")
    ).toBe(false);
  });
  it("영구는 항상 활성", () => {
    expect(isSanctionActive("permanent", null, "2030-01-01T00:00:00.000Z")).toBe(true);
  });
  it("경고는 비활성(기록)", () => {
    expect(isSanctionActive("warn", "2026-06-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z")).toBe(
      false
    );
  });
});

describe("shouldBlockLogin", () => {
  it("활성 기간제 차단", () => {
    expect(
      shouldBlockLogin("thirty_days", "2026-07-01T00:00:00.000Z", "2026-06-10T00:00:00.000Z")
    ).toBe(true);
  });
  it("영구 차단", () => {
    expect(shouldBlockLogin("permanent", null, "2030-01-01T00:00:00.000Z")).toBe(true);
  });
  it("경고는 차단 안 함", () => {
    expect(shouldBlockLogin("warn", null, "2026-06-10T00:00:00.000Z")).toBe(false);
  });
  it("만료된 기간제는 차단 안 함", () => {
    expect(
      shouldBlockLogin("seven_days", "2026-06-08T00:00:00.000Z", "2026-06-10T00:00:00.000Z")
    ).toBe(false);
  });
});
