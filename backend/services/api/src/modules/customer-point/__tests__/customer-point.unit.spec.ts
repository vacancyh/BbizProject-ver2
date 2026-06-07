/**
 * 포인트 모듈 단위 테스트 (d5 t005_포인트 — production 모듈 직접 검증)
 *
 * 전략: production logic.ts 직접 import + service/route 소스 구조 검증(fs). 복제본 없음.
 */
import {
  calcPointsEarn,
  calcExpiryDate,
  isPointExpired,
  isExpiringWithin,
  calcBalanceFromLedger,
  canRedeemPoints,
  type PointLedgerEntry,
} from "../logic"

import * as fs from "fs"
import * as path from "path"

describe("calcPointsEarn: 구매금액×적립률(내림)", () => {
  test("정상 내림", () => {
    expect(calcPointsEarn(50000, 2)).toBe(1000)
    expect(calcPointsEarn(9999, 1)).toBe(99) // 99.99 → 99 내림
  })
  test("음수 금액은 에러", () => {
    expect(() => calcPointsEarn(-1, 1)).toThrow()
  })
  test("적립률 범위(0~100) 밖이면 에러", () => {
    expect(() => calcPointsEarn(1000, 150)).toThrow()
    expect(() => calcPointsEarn(1000, -1)).toThrow()
  })
})

describe("calcExpiryDate / isPointExpired", () => {
  test("적립일 + validDays = 만료일", () => {
    expect(calcExpiryDate("2026-01-01T00:00:00.000Z", 30)).toBe("2026-01-31T00:00:00.000Z")
  })
  test("validDays <= 0 이면 에러", () => {
    expect(() => calcExpiryDate("2026-01-01T00:00:00.000Z", 0)).toThrow()
  })
  test("만료 전/후 판정", () => {
    expect(isPointExpired("2026-02-01T00:00:00.000Z", "2026-01-15T00:00:00.000Z")).toBe(false)
    expect(isPointExpired("2026-01-01T00:00:00.000Z", "2026-02-01T00:00:00.000Z")).toBe(true)
  })
})

describe("isExpiringWithin: 소멸 임박 D-N", () => {
  test("N일 이내면 true", () => {
    expect(isExpiringWithin("2026-01-10T00:00:00.000Z", "2026-01-05T00:00:00.000Z", 7)).toBe(true)
  })
  test("N일 밖이면 false", () => {
    expect(isExpiringWithin("2026-02-10T00:00:00.000Z", "2026-01-05T00:00:00.000Z", 7)).toBe(false)
  })
  test("이미 만료면 false", () => {
    expect(isExpiringWithin("2026-01-01T00:00:00.000Z", "2026-01-05T00:00:00.000Z", 7)).toBe(false)
  })
})

describe("calcBalanceFromLedger: 원장 합산(0 바닥)", () => {
  test("적립-사용 합산", () => {
    const e: PointLedgerEntry[] = [
      { type: "earn", amount: 1000 },
      { type: "redeem", amount: -300 },
      { type: "earn", amount: 500 },
    ]
    expect(calcBalanceFromLedger(e)).toBe(1200)
  })
  test("음수 합은 0으로 바닥", () => {
    const e: PointLedgerEntry[] = [
      { type: "earn", amount: 100 },
      { type: "redeem", amount: -500 },
    ]
    expect(calcBalanceFromLedger(e)).toBe(0)
  })
})

describe("canRedeemPoints: 사용 검증", () => {
  test("잔액 이내 정상", () => {
    const r = canRedeemPoints(1000, 300)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.nextBalance).toBe(700)
  })
  test("잔액 초과 거부", () => {
    expect(canRedeemPoints(100, 500).ok).toBe(false)
  })
  test("0 이하/비정수 거부", () => {
    expect(canRedeemPoints(1000, 0).ok).toBe(false)
    expect(canRedeemPoints(1000, -5).ok).toBe(false)
    expect(canRedeemPoints(1000, 1.5).ok).toBe(false)
  })
})

describe("service.ts 구조 검증", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "../service.ts"), "utf-8")
  test("logic 룰 import(calcBalanceFromLedger/canRedeemPoints/calcExpiryDate)", () => {
    expect(src).toContain("calcBalanceFromLedger")
    expect(src).toContain("canRedeemPoints")
    expect(src).toContain("calcExpiryDate")
    expect(src).toContain("./logic")
  })
  test("earnPoints / redeemPoints / getBalance / earnFromPurchase 메서드 존재", () => {
    expect(src).toContain("earnPoints")
    expect(src).toContain("redeemPoints")
    expect(src).toContain("getBalance")
    expect(src).toContain("earnFromPurchase")
  })
  test("MedusaService 자동 메서드(createPointLedgers/listPointLedgers) 사용", () => {
    expect(src).toContain("createPointLedgers")
    expect(src).toContain("listPointLedgers")
  })
})

describe("route.ts 구조 검증", () => {
  const earnSrc = fs.readFileSync(
    path.resolve(__dirname, "../../../api/admin/points/customers/[id]/earn/route.ts"),
    "utf-8"
  )
  const redeemSrc = fs.readFileSync(
    path.resolve(__dirname, "../../../api/admin/points/customers/[id]/redeem/route.ts"),
    "utf-8"
  )
  test("earn route 가 validDays 폴백으로 point.expire_months 정책을 조회", () => {
    expect(earnSrc).toContain("point.expire_months")
  })
  test("redeem route 가 useAmount 검증(400)", () => {
    expect(redeemSrc).toContain("useAmount")
    expect(redeemSrc).toContain("400")
  })
})
