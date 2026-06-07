/**
 * 타임세일 모듈 단위 테스트(jest).
 *  - logic.ts 순수함수 직접 import 검증(isSaleActive/resolveSaleStatus/calcSalePrice/validateSale).
 *  - service.ts 는 DB 의존이라 소스 구조만 fs 로 검증(toView Number 정규화 + logic 위임).
 */
import * as fs from "fs"
import * as path from "path"
import {
  isSaleActive,
  resolveSaleStatus,
  calcSalePrice,
  validateSale,
} from "../logic"

const T0 = "2026-06-04T00:00:00.000Z"
const T_START = "2026-06-04T10:00:00.000Z"
const T_MID = "2026-06-04T12:00:00.000Z"
const T_END = "2026-06-04T14:00:00.000Z"
const T_AFTER = "2026-06-04T20:00:00.000Z"

describe("time-sale logic — isSaleActive", () => {
  it("진행 구간(startsAt <= now < endsAt)이면 true", () => {
    expect(isSaleActive(T_START, T_END, T_MID)).toBe(true)
  })
  it("시작 시각 경계는 포함(>=)", () => {
    expect(isSaleActive(T_START, T_END, T_START)).toBe(true)
  })
  it("종료 시각 경계는 미포함(<)", () => {
    expect(isSaleActive(T_START, T_END, T_END)).toBe(false)
  })
  it("시작 전이면 false", () => {
    expect(isSaleActive(T_START, T_END, T0)).toBe(false)
  })
  it("종료 후면 false", () => {
    expect(isSaleActive(T_START, T_END, T_AFTER)).toBe(false)
  })
  it("잘못된 ISO 는 false(안전 측)", () => {
    expect(isSaleActive("not-a-date", T_END, T_MID)).toBe(false)
  })
})

describe("time-sale logic — resolveSaleStatus", () => {
  it("시작 전 → scheduled", () => {
    expect(resolveSaleStatus(T_START, T_END, T0)).toBe("scheduled")
  })
  it("진행 중 → active", () => {
    expect(resolveSaleStatus(T_START, T_END, T_MID)).toBe("active")
  })
  it("시작 경계 → active", () => {
    expect(resolveSaleStatus(T_START, T_END, T_START)).toBe("active")
  })
  it("종료 경계/이후 → ended", () => {
    expect(resolveSaleStatus(T_START, T_END, T_END)).toBe("ended")
    expect(resolveSaleStatus(T_START, T_END, T_AFTER)).toBe("ended")
  })
  it("잘못된 ISO 는 scheduled(안전 측)", () => {
    expect(resolveSaleStatus("x", T_END, T_MID)).toBe("scheduled")
  })
})

describe("time-sale logic — calcSalePrice (percent)", () => {
  it("10000 의 30% 할인 → 7000", () => {
    expect(calcSalePrice(10000, "percent", 30)).toBe(7000)
  })
  it("내림 적용: 9999 의 10% → 8999(floor)", () => {
    expect(calcSalePrice(9999, "percent", 10)).toBe(8999)
  })
  it("할인율 100 초과는 100 으로 클램프 → 0", () => {
    expect(calcSalePrice(10000, "percent", 150)).toBe(0)
  })
  it("할인율 0 → 원가 유지", () => {
    expect(calcSalePrice(10000, "percent", 0)).toBe(10000)
  })
})

describe("time-sale logic — calcSalePrice (fixed)", () => {
  it("10000 - 3000 → 7000", () => {
    expect(calcSalePrice(10000, "fixed", 3000)).toBe(7000)
  })
  it("0 바닥: 10000 - 99999 → 0", () => {
    expect(calcSalePrice(10000, "fixed", 99999)).toBe(0)
  })
})

describe("time-sale logic — calcSalePrice (경계/0바닥)", () => {
  it("원가 0 이하 → 0", () => {
    expect(calcSalePrice(0, "percent", 30)).toBe(0)
    expect(calcSalePrice(-5, "fixed", 10)).toBe(0)
  })
  it("음수 할인값 → 원가 유지(percent)", () => {
    expect(calcSalePrice(10000, "percent", -10)).toBe(10000)
  })
})

describe("time-sale logic — validateSale", () => {
  it("정상 percent 입력 → valid", () => {
    const r = validateSale({
      discountType: "percent",
      discountValue: 30,
      startsAt: T_START,
      endsAt: T_END,
    })
    expect(r.valid).toBe(true)
    expect(r.errors).toHaveLength(0)
  })
  it("정상 fixed 입력 → valid", () => {
    const r = validateSale({
      discountType: "fixed",
      discountValue: 3000,
      startsAt: T_START,
      endsAt: T_END,
    })
    expect(r.valid).toBe(true)
  })
  it("percent 범위 위반(>100) → invalid", () => {
    const r = validateSale({
      discountType: "percent",
      discountValue: 120,
      startsAt: T_START,
      endsAt: T_END,
    })
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })
  it("fixed 0 이하 → invalid", () => {
    const r = validateSale({
      discountType: "fixed",
      discountValue: 0,
      startsAt: T_START,
      endsAt: T_END,
    })
    expect(r.valid).toBe(false)
  })
  it("기간 역전(starts >= ends) → invalid", () => {
    const r = validateSale({
      discountType: "percent",
      discountValue: 30,
      startsAt: T_END,
      endsAt: T_START,
    })
    expect(r.valid).toBe(false)
  })
  it("잘못된 ISO → invalid", () => {
    const r = validateSale({
      discountType: "percent",
      discountValue: 30,
      startsAt: "nope",
      endsAt: T_END,
    })
    expect(r.valid).toBe(false)
  })
})

describe("time-sale service — 소스 구조 검증", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "service.ts"),
    "utf-8"
  )
  it("MedusaService({ TimeSale }) 로 정의", () => {
    expect(src).toMatch(/MedusaService\(\{\s*TimeSale\s*,?\s*\}\)/)
  })
  it("numeric 필드 Number() 정규화(toView)", () => {
    expect(src).toContain("toView")
    expect(src).toContain("Number(row.discount_value)")
    expect(src).toContain("Number(row.original_price)")
  })
  it("상태 판정은 logic 에 위임(resolveSaleStatus/isSaleActive import)", () => {
    expect(src).toContain("resolveSaleStatus")
    expect(src).toContain("isSaleActive")
  })
  it("필수 메서드 노출(createSale/listSales/getSale/endSale/listActiveSales)", () => {
    for (const m of [
      "createSale",
      "listSales",
      "getSale",
      "endSale",
      "listActiveSales",
    ]) {
      expect(src).toContain(m)
    }
  })
})
