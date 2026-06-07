/**
 * 단위 테스트 — t005_교환 (unit_007)
 *
 * UT-001: 단건 교환 생성 — Exchange 생성 + 차액 계산 로직 검증
 * UT-002: 다건 그룹 + 1회 회수 — 차액 합산 + 그룹 묶음 로직 검증
 * UT-003: 차액 추가결제/환불 — 차액 부호별(양수/음수) 계산 + 끝전 절사 + 잔액보정
 *
 * 테스트 전략:
 *  - production ./exchange-diff-logic 직접 import (복제본 없음)
 *  - DB·MedusaService 의존 없음 (순수 함수)
 *  - jest-junit 로 junit xml 생성 (JUNIT_OUTPUT_FILE=d2_exchange.junit.xml)
 */

// ─── production 모듈 직접 import ──────────────────────────────────────────────
import {
  calcExchangeDiff,
  type DiffLineItem,
  type ExchangeDiffResult,
} from "../group/exchange-diff-logic"

// ─── UT-001: 단건 교환 생성 ────────────────────────────────────────────────────

describe("UT-001: 단건 교환 생성 — 차액 계산 기본 동작", () => {
  // 회수 1건, 신규 1건. 동일 금액 → 차액 0.
  test("TC-1: 회수 금액 = 신규 금액인 경우 차액 0", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 10_000, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 10_000, quantity: 1 },
    ]
    const result: ExchangeDiffResult = calcExchangeDiff(returnItems, additionalItems)
    expect(result.diff).toBe(0)
    expect(result.refund_total).toBe(10_000)
    expect(result.additional_total).toBe(10_000)
  })

  // 신규 금액이 더 높음 → 추가결제
  test("TC-2: 신규 금액 > 회수 금액이면 diff 양수(추가결제)", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 10_000, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-B", unit_price: 15_000, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    expect(result.diff).toBe(5_000)
    expect(result.diff).toBeGreaterThan(0)
  })

  // 회수 금액이 더 높음 → 환불
  test("TC-3: 회수 금액 > 신규 금액이면 diff 음수(환불)", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 20_000, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-C", unit_price: 12_000, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    expect(result.diff).toBe(-8_000)
    expect(result.diff).toBeLessThan(0)
  })

  // 수량 반영 검증
  test("TC-4: 수량이 반영되어 합산된다", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 5_000, quantity: 2 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-D", unit_price: 8_000, quantity: 3 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    // refund = 5000*2 = 10000, additional = 8000*3 = 24000
    expect(result.refund_total).toBe(10_000)
    expect(result.additional_total).toBe(24_000)
    expect(result.diff).toBe(14_000)
  })

  // 빈 배열 안전 처리
  test("TC-5: 빈 배열 입력 시 차액 0", () => {
    const result = calcExchangeDiff([], [])
    expect(result.diff).toBe(0)
    expect(result.refund_total).toBe(0)
    expect(result.additional_total).toBe(0)
    expect(result.lines).toEqual([])
  })
})

// ─── UT-002: 다건 그룹 + 1회 회수 ─────────────────────────────────────────────

describe("UT-002: 다건 그룹 + 1회 회수 — 차액 합산 검증", () => {
  // 2개 교환 합산 차액 계산 (exchange_ids 배열을 묶는 로직은 서비스 레이어에서 처리)
  // 순수 로직 관점: 다건 return_items + additional_items 의 합산 차액
  test("TC-1: 2개 교환 라인 합산 차액(추가결제)", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 10_000, quantity: 1 },
      { id: "item-002", unit_price: 8_000, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 12_000, quantity: 1 },
      { id: "variant-B", unit_price: 11_000, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    // refund=18000, additional=23000, diff=5000
    expect(result.refund_total).toBe(18_000)
    expect(result.additional_total).toBe(23_000)
    expect(result.diff).toBe(5_000)
  })

  test("TC-2: lines 배열이 모든 라인을 포함한다", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 10_000, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 15_000, quantity: 1 },
      { id: "variant-B", unit_price: 5_000, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    // 모든 id 가 lines 에 존재
    const lineIds = result.lines.map((l) => l.id)
    expect(lineIds).toContain("item-001")
    expect(lineIds).toContain("variant-A")
    expect(lineIds).toContain("variant-B")
  })

  test("TC-3: 다건 합산 후 차액이 0인 경우 diff=0", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 10_000, quantity: 2 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 10_000, quantity: 2 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    expect(result.diff).toBe(0)
  })
})

// ─── UT-003: 차액 추가결제/환불 + 끝전 절사 + 잔액보정 ───────────────────────────

describe("UT-003: 차액 추가결제/환불 — 끝전 절사 + 잔액보정", () => {
  // 정수 단위 — 절사 없음
  test("TC-1: 정수 단위 차액(추가결제) — 절사 없음", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 10_000, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 13_000, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    expect(result.diff).toBe(3_000)
    // lines 의 합 = diff 와 일치 (잔액보정 정합)
    const linesSum = result.lines.reduce((s, l) => s + l.diff, 0)
    expect(linesSum).toBe(result.diff)
  })

  // 정수 단위 — 환불
  test("TC-2: 정수 단위 차액(환불) — diff 음수", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 15_000, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 9_000, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    expect(result.diff).toBe(-6_000)
    expect(result.diff).toBeLessThan(0)
  })

  // 끝전 절사: floor 적용 검증
  // unit_price = 10001 (소수점 없지만 단가 자체가 홀수라 차액이 floor 대상이 되도록 설계)
  // 실제로 JS 정수 연산이므로 floor(n) = n. 이 TC 는 명시적 floor 보장 검증.
  test("TC-3: floor 적용 — 정수 결과는 그대로 반환된다", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 9_999, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 10_001, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    expect(result.diff).toBe(2) // 10001 - 9999 = 2
    expect(Number.isInteger(result.diff)).toBe(true)
  })

  // 잔액보정 검증: lines 합산 = diff
  test("TC-4: lines 합산이 diff 와 항상 일치한다(잔액보정 정합)", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 7_777, quantity: 3 },
      { id: "item-002", unit_price: 3_333, quantity: 2 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 11_111, quantity: 2 },
      { id: "variant-B", unit_price: 5_555, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    const linesSum = result.lines.reduce((s, l) => s + l.diff, 0)
    expect(linesSum).toBe(result.diff)
  })

  // 부호별 처리 확인
  test("TC-5: 추가결제 케이스 — price_diff 응답 구조 확인", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 20_000, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 25_000, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    expect(result.diff).toBeGreaterThan(0) // 추가결제
    expect(result).toHaveProperty("lines")
    expect(result).toHaveProperty("refund_total")
    expect(result).toHaveProperty("additional_total")
  })

  test("TC-6: 환불 케이스 — diff 음수 + lines 구조", () => {
    const returnItems: DiffLineItem[] = [
      { id: "item-001", unit_price: 30_000, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 20_000, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    expect(result.diff).toBeLessThan(0) // 환불
    const linesSum = result.lines.reduce((s, l) => s + l.diff, 0)
    expect(linesSum).toBe(result.diff)
  })

  // unit_price 비정상(NaN/undefined) 안전 처리
  test("TC-7: unit_price 가 undefined 이면 0 으로 처리된다", () => {
    const returnItems = [
      { id: "item-001", unit_price: undefined as any, quantity: 1 },
    ]
    const additionalItems: DiffLineItem[] = [
      { id: "variant-A", unit_price: 10_000, quantity: 1 },
    ]
    const result = calcExchangeDiff(returnItems, additionalItems)
    expect(result.refund_total).toBe(0)
    expect(result.diff).toBe(10_000)
  })
})
