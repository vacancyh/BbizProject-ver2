/**
 * 목록 필터 유닛 테스트 (2026-08-03 신설)
 *
 * 가격대 필터는 **경계값에서 틀리기 쉽다**(2만원짜리가 "2만원 이하"와 "2~4만원" 중
 * 어디에 들어가는가). 구간이 겹치거나 비면 상품이 두 번 나오거나 사라진다.
 * E2E 로는 이런 경계를 다 훑을 수 없어 유닛으로 고정한다.
 */
import { describe, it, expect } from "vitest"
import { PRICE_RANGES } from "./filter-config"

/** 화면 로직과 동일한 판정 — 여기서 규칙을 고정한다. */
function inRange(price: number, key: string): boolean {
  const r = PRICE_RANGES.find((x) => x.key === key)
  if (!r || r.key === "all") return true
  if (r.min !== undefined && price < r.min) return false
  if (r.max !== undefined && price > r.max) return false
  return true
}

describe("PRICE_RANGES — 가격대 프리셋", () => {
  it("'전체'가 첫 항목이고 조건이 없다", () => {
    expect(PRICE_RANGES[0].key).toBe("all")
    expect(PRICE_RANGES[0].min).toBeUndefined()
    expect(PRICE_RANGES[0].max).toBeUndefined()
  })

  it("모든 구간에 사람이 읽을 라벨이 있다", () => {
    for (const r of PRICE_RANGES) {
      expect(r.label.trim().length).toBeGreaterThan(0)
    }
  })

  it("키가 중복되지 않는다", () => {
    const keys = PRICE_RANGES.map((r) => r.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("구간 사이에 빈 곳이 없다 — 어떤 가격도 최소 한 구간에는 속한다", () => {
    const prices = [0, 1, 19999, 20000, 20001, 39999, 40000, 59999, 60000, 100000, 9999999]
    for (const p of prices) {
      const hit = PRICE_RANGES.filter((r) => r.key !== "all").some((r) => inRange(p, r.key))
      expect(hit, `${p}원이 어떤 구간에도 속하지 않는다`).toBe(true)
    }
  })

  it("경계값 판정이 라벨과 어긋나지 않는다", () => {
    // "2만원 이하" — 20,000원 포함
    expect(inRange(20000, "0-20000")).toBe(true)
    expect(inRange(20001, "0-20000")).toBe(false)
    // "6만원 이상" — 60,000원 포함, 상한 없음
    expect(inRange(60000, "60000-")).toBe(true)
    expect(inRange(99999999, "60000-")).toBe(true)
    expect(inRange(59999, "60000-")).toBe(false)
  })

  it("'전체'는 모든 가격을 통과시킨다", () => {
    for (const p of [0, 12345, 9999999]) expect(inRange(p, "all")).toBe(true)
  })

  it("알 수 없는 키는 필터를 걸지 않는다(상품이 통째로 사라지면 안 된다)", () => {
    expect(inRange(30000, "존재하지-않는-키")).toBe(true)
  })
})
