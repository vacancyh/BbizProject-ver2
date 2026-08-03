/**
 * 금액 표시 유닛 테스트 (2026-08-03 신설)
 *
 * 왜 이걸 먼저 테스트하나: 고객에게 **잘못된 금액이 보이는 것**은 스토어프론트에서
 * 가장 치명적인 버그다. 신뢰를 잃고 클레임으로 직결된다.
 * E2E 로는 경계값(0원, 소수점, 통화 미지정)을 촘촘히 검사하기 어렵다.
 */
import { describe, it, expect } from "vitest"
import { convertToLocale } from "./money"
import { getPercentageDiff } from "./get-percentage-diff"
import { isEmpty } from "./isEmpty"

describe("convertToLocale — 금액 표시", () => {
  it("원화를 한국 로케일로 표시한다", () => {
    const out = convertToLocale({ amount: 40000, currency_code: "krw" })
    // 로케일/Node 버전에 따라 기호 위치·공백이 다를 수 있어 숫자 표기를 검증한다.
    expect(out).toContain("40,000")
  })

  it("0원도 정상 표시한다(빈 문자열이 되면 안 된다)", () => {
    const out = convertToLocale({ amount: 0, currency_code: "krw" })
    expect(out).toContain("0")
    expect(out.trim().length).toBeGreaterThan(0)
  })

  it("통화 코드가 없으면 숫자 문자열로 폴백한다", () => {
    expect(convertToLocale({ amount: 1234, currency_code: "" })).toBe("1234")
  })

  it("큰 금액에 천 단위 구분이 들어간다", () => {
    expect(convertToLocale({ amount: 1234567, currency_code: "krw" })).toContain("1,234,567")
  })

  it("음수(환불 표기 등)도 부호를 잃지 않는다", () => {
    const out = convertToLocale({ amount: -5000, currency_code: "krw" })
    expect(out).toMatch(/-|−/)
    expect(out).toContain("5,000")
  })
})

describe("getPercentageDiff — 할인율", () => {
  it("정가 대비 할인율을 계산한다", () => {
    expect(getPercentageDiff(10000, 8000)).toBe("20")
  })

  it("할인이 없으면 0", () => {
    expect(getPercentageDiff(10000, 10000)).toBe("0")
  })

  it("반올림된 정수 문자열을 돌려준다", () => {
    // 10000 → 6667 은 33.33% — 소수점이 화면에 새면 안 된다
    expect(getPercentageDiff(10000, 6667)).toBe("33")
  })

  it("정가가 0이면 유한한 숫자가 아니다 — 화면에 그대로 쓰면 안 된다", () => {
    // 0으로 나누기. 현재 구현은 "NaN"/"Infinity" 문자열을 돌려준다.
    // 호출측에서 정가 0 을 걸러야 한다는 사실을 테스트로 고정한다.
    const out = getPercentageDiff(0, 0)
    expect(Number.isFinite(Number(out))).toBe(false)
  })
})

describe("isEmpty", () => {
  it("빈 문자열·빈 객체·빈 배열을 비었다고 본다", () => {
    expect(isEmpty("")).toBe(true)
    expect(isEmpty({})).toBe(true)
    expect(isEmpty([])).toBe(true)
  })

  it("값이 있으면 비어 있지 않다", () => {
    expect(isEmpty("krw")).toBe(false)
    expect(isEmpty({ a: 1 })).toBe(false)
    expect(isEmpty([1])).toBe(false)
  })
})
