/**
 * points-logic 단위 테스트 (d5 t005_포인트)
 * spec: dag/d5_회원관리/t005_포인트.md §9 — 적립/유효기간/소멸/잔액/사용
 */
import { describe, it, expect } from "vitest";
import {
  calcPointsEarn,
  calcExpiryDate,
  isPointExpired,
  isExpiringWithin,
  calcBalanceFromLedger,
  canRedeemPoints,
} from "./points-logic";

describe("calcPointsEarn", () => {
  it("구매금액 × 적립률 내림", () => {
    expect(calcPointsEarn(10_000, 1)).toBe(100);
    expect(calcPointsEarn(9_999, 1)).toBe(99); // floor
    expect(calcPointsEarn(10_000, 2.5)).toBe(250);
  });
  it("음수 금액 throw", () => {
    expect(() => calcPointsEarn(-1, 1)).toThrow();
  });
  it("적립률 범위 위반 throw", () => {
    expect(() => calcPointsEarn(100, 101)).toThrow();
  });
});

describe("calcExpiryDate / isPointExpired", () => {
  it("적립일 + 유효일수", () => {
    const exp = calcExpiryDate("2026-01-01T00:00:00.000Z", 365);
    expect(exp).toBe("2027-01-01T00:00:00.000Z");
  });
  it("유효일수 0 이하 throw", () => {
    expect(() => calcExpiryDate("2026-01-01T00:00:00.000Z", 0)).toThrow();
  });
  it("만료 판정", () => {
    expect(isPointExpired("2026-06-01T00:00:00.000Z", "2026-06-02T00:00:00.000Z")).toBe(true);
    expect(isPointExpired("2026-06-03T00:00:00.000Z", "2026-06-02T00:00:00.000Z")).toBe(false);
  });
});

describe("isExpiringWithin (D-N 알림)", () => {
  it("N일 이내면 true", () => {
    // 만료 2026-06-10, now 2026-06-05, 7일 이내 → true
    expect(isExpiringWithin("2026-06-10T00:00:00.000Z", "2026-06-05T00:00:00.000Z", 7)).toBe(true);
  });
  it("N일 밖이면 false", () => {
    expect(isExpiringWithin("2026-06-30T00:00:00.000Z", "2026-06-05T00:00:00.000Z", 7)).toBe(false);
  });
  it("이미 만료면 false", () => {
    expect(isExpiringWithin("2026-06-01T00:00:00.000Z", "2026-06-05T00:00:00.000Z", 7)).toBe(false);
  });
});

describe("calcBalanceFromLedger", () => {
  it("적립/사용/소멸 부분합", () => {
    const bal = calcBalanceFromLedger([
      { type: "earn", amount: 1000 },
      { type: "redeem", amount: -300 },
      { type: "expire", amount: -200 },
    ]);
    expect(bal).toBe(500);
  });
  it("음수 방지(0 바닥)", () => {
    expect(calcBalanceFromLedger([{ type: "redeem", amount: -100 }])).toBe(0);
  });
});

describe("canRedeemPoints", () => {
  it("잔액 이내 사용 허용", () => {
    const r = canRedeemPoints(500, 200);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nextBalance).toBe(300);
  });
  it("잔액 초과 거부", () => {
    expect(canRedeemPoints(100, 200).ok).toBe(false);
  });
  it("0 이하/비정수 거부", () => {
    expect(canRedeemPoints(500, 0).ok).toBe(false);
    expect(canRedeemPoints(500, -10).ok).toBe(false);
    expect(canRedeemPoints(500, 1.5).ok).toBe(false);
  });
});
