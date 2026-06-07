/**
 * 정산 지급 모듈 단위 테스트 (d7 정산 — production 직접 검증)
 */
import {
  PAYOUT_STATUSES,
  calcNet,
  calcPgFee,
  canTransitionPayout,
} from "../logic"

import * as fs from "fs"
import * as path from "path"

describe("calcNet / calcPgFee", () => {
  test("순정산 = 매출-환불-수수료", () => {
    expect(calcNet(1000000, 100000, 30000)).toBe(870000)
  })
  test("환불 초과 시 음수 허용", () => {
    expect(calcNet(100000, 200000, 0)).toBe(-100000)
  })
  test("PG수수료 = 매출×율 내림", () => {
    expect(calcPgFee(1000000, 3)).toBe(30000)
    expect(calcPgFee(33333, 3)).toBe(999) // 999.99 내림
    expect(calcPgFee(1000000, 0)).toBe(0)
  })
  test("수수료율 범위 밖 에러", () => {
    expect(() => calcPgFee(1000, 150)).toThrow()
  })
})

describe("canTransitionPayout: 상태 전이", () => {
  test("open→closed 허용", () => {
    expect(canTransitionPayout("open", "closed")).toBe(true)
  })
  test("closed→paid 허용, closed→open(재집계) 허용", () => {
    expect(canTransitionPayout("closed", "paid")).toBe(true)
    expect(canTransitionPayout("closed", "open")).toBe(true)
  })
  test("paid 는 종료 상태(전이 불가)", () => {
    expect(canTransitionPayout("paid", "closed")).toBe(false)
    expect(canTransitionPayout("paid", "open")).toBe(false)
  })
  test("open→paid 직행 불가(마감 선행)", () => {
    expect(canTransitionPayout("open", "paid")).toBe(false)
  })
  test("PAYOUT_STATUSES 3종", () => {
    expect(PAYOUT_STATUSES).toEqual(["open", "closed", "paid"])
  })
})

describe("service.ts / route.ts 구조 검증", () => {
  const svc = fs.readFileSync(path.resolve(__dirname, "../service.ts"), "utf-8")
  const upsertRoute = fs.readFileSync(
    path.resolve(__dirname, "../../../api/admin/settlement/periods/[key]/route.ts"),
    "utf-8"
  )
  test("service 가 logic 룰 import(calcNet/canTransitionPayout)", () => {
    expect(svc).toContain("calcNet")
    expect(svc).toContain("canTransitionPayout")
    expect(svc).toContain("./logic")
  })
  test("upsertSnapshot/closePeriod/payPeriod 메서드 존재", () => {
    expect(svc).toContain("upsertSnapshot")
    expect(svc).toContain("closePeriod")
    expect(svc).toContain("payPeriod")
  })
  test("upsert route 가 pgFee 폴백으로 settlement.pg_fee_rate 정책 조회", () => {
    expect(upsertRoute).toContain("settlement.pg_fee_rate")
    expect(upsertRoute).toContain("calcPgFee")
  })
})
