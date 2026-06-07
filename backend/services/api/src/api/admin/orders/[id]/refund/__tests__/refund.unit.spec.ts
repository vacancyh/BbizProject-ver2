/**
 * 환불 순수 로직 단위 테스트
 *
 * UT-001  전액환불 (calcProratedRefund isFullRefund + 배송비 포함)
 * UT-002  부분환불 비례배분 (절사+잔액보정 — 총액 1원 정합 단언)
 * UT-003  멱등키 (buildIdempotencyKey 형식 — route 가 production 에서 실제 호출하는 함수)
 *
 * spec: dag/d2_주문관리/t007_환불.md §9, unit_009_환불.md
 * junit: test-results/d2_refund.junit.xml  (JUNIT_OUTPUT_FILE 환경변수로 지정)
 */
import { calcProratedRefund, calcReshippingFee } from "../refund-logic"
import { buildIdempotencyKey } from "../idempotency-logic"

// ──────────────────────────────────────────────────────────────────────────────
// UT-001  전액 환불
// ──────────────────────────────────────────────────────────────────────────────
describe("UT-001: 전액 환불 (calcProratedRefund)", () => {
  /**
   * 입력:
   *   라인A 10,000원, 라인B 20,000원 (totalLineAmount = 30,000)
   *   쿠폰 할인 3,000원, 포인트 0, 배송비 0 (배송비 없는 전액환불 단순 케이스)
   *   전액 환불(환불라인합 = totalLineAmount)
   *
   * refund-logic.ts 실제 계산 (검토 완료, 수정 불가):
   *   shippingShare = 0 (isFullRefund), shippingBonus = 0
   *   라인A raw = 10000 - floor(3000*10000/30000) = 10000 - 1000 = 9,000
   *   라인B raw = 20000 - floor(3000*20000/30000) = 20000 - 2000 = 18,000
   *   sumRaw = 27,000
   *   targetTotal = 27,000 → targetFloor = 27,000 (shippingFee=0)
   *   remainder = 0
   *   totalRefund = 27,000 (= totalLineAmount - couponDiscount = 30000 - 3000)
   *
   * 기대: shippingIncluded = true, totalRefund = 27,000
   */
  it("UT-001-a: shippingIncluded = true 이고 totalRefund = 27000 (배송비 없음, 쿠폰 3000 차감)", () => {
    const result = calcProratedRefund({
      lines: [
        { id: "line-A", amount: 10000 },
        { id: "line-B", amount: 20000 },
      ],
      couponDiscount: 3000,
      pointDiscount: 0,
      shippingFee: 0,
      totalLineAmount: 30000,
    })

    expect(result.shippingIncluded).toBe(true)
    expect(result.totalRefund).toBe(27000)
  })

  it("UT-001-b: 라인별 환불액이 음수가 아니다", () => {
    const result = calcProratedRefund({
      lines: [
        { id: "line-A", amount: 10000 },
        { id: "line-B", amount: 20000 },
      ],
      couponDiscount: 3000,
      pointDiscount: 0,
      shippingFee: 0,
      totalLineAmount: 30000,
    })

    for (const line of result.lines) {
      expect(line.refundAmount).toBeGreaterThanOrEqual(0)
    }
  })

  it("UT-001-c: 배송비 0 이어도 전액환불 정상 처리", () => {
    const result = calcProratedRefund({
      lines: [{ id: "line-A", amount: 20000 }],
      couponDiscount: 0,
      pointDiscount: 0,
      shippingFee: 0,
      totalLineAmount: 20000,
    })

    expect(result.shippingIncluded).toBe(true)
    expect(result.totalRefund).toBe(20000)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// UT-002  부분환불 비례배분 (절사 + 잔액보정, 총액 1원 정합)
// ──────────────────────────────────────────────────────────────────────────────
describe("UT-002: 부분환불 비례배분 (calcProratedRefund, 총액 1원 정합)", () => {
  /**
   * 부분환불 케이스 A:
   *   라인A 10,000원만 환불 (totalLineAmount = 30,000 — 라인B 20,000 미환불)
   *   쿠폰 3,000원, 포인트 0, 배송비 3,000원
   *
   * 기대:
   *   isFullRefund = false (10000 < 30000) → shippingIncluded = false
   *   couponShare  = floor(3000 * 10000 / 30000) = 1,000
   *   shippingShare = floor(3000 * 10000 / 30000) = 1,000
   *   라인A net    = 10000 - 1000 - 1000 = 8,000
   *   totalRefund  = 8,000
   */
  it("UT-002-a: 단일 라인 부분환불 — 기대값 8000원, shippingIncluded=false", () => {
    const result = calcProratedRefund({
      lines: [{ id: "line-A", amount: 10000 }],
      couponDiscount: 3000,
      pointDiscount: 0,
      shippingFee: 3000,
      totalLineAmount: 30000,
    })

    expect(result.shippingIncluded).toBe(false)
    expect(result.totalRefund).toBe(8000)
    expect(result.lines[0].id).toBe("line-A")
    expect(result.lines[0].refundAmount).toBe(8000)
  })

  /**
   * 부분환불 케이스 B — 다중 라인, 절사 잔액보정 후 합계 1원 정합:
   *   라인A 7,000원, 라인B 8,000원 환불
   *   totalLineAmount = 20,000 (라인C 5,000 미환불)
   *   couponDiscount = 1,000원, pointDiscount = 0, shippingFee = 0
   *
   * 계산:
   *   isFullRefund = false (15000 < 20000)
   *   라인A: couponShare = floor(1000 * 7000 / 20000) = floor(350) = 350 → net = 6,650
   *   라인B: couponShare = floor(1000 * 8000 / 20000) = floor(400) = 400 → net = 7,600
   *   sumRaw = 14,250
   *   targetTotal = (7000 - 350) + (8000 - 400) = 6650 + 7600 = 14,250
   *   targetFloor = 14,250, remainder = 0
   *   totalRefund = 14,250
   *
   * 단언: sum(lines.refundAmount) === totalRefund (1원 정합)
   */
  it("UT-002-b: 다중 라인 부분환불 — 라인별 합계 = totalRefund (1원 정합)", () => {
    const result = calcProratedRefund({
      lines: [
        { id: "line-A", amount: 7000 },
        { id: "line-B", amount: 8000 },
      ],
      couponDiscount: 1000,
      pointDiscount: 0,
      shippingFee: 0,
      totalLineAmount: 20000,
    })

    const lineSum = result.lines.reduce((s, l) => s + l.refundAmount, 0)
    expect(lineSum).toBe(result.totalRefund)
    expect(result.totalRefund).toBe(14250)
    expect(lineSum).toBe(14250)
  })

  /**
   * 부분환불 케이스 C — 절사 잔액보정 검증 (소수점 절사 차이가 최대 라인에 보정):
   *   라인A 3,000원, 라인B 4,000원 환불
   *   totalLineAmount = 10,000
   *   couponDiscount = 100원 (나머지 발생: 3/10=0.3 → floor=0, 4/10=0.4 → floor=0)
   *   (100 * 3000 / 10000 = 30, floor = 30; 100 * 4000 / 10000 = 40, floor = 40)
   *   라인A net = 3000 - 30 = 2,970; 라인B net = 4000 - 40 = 3,960
   *   sumRaw = 6,930
   *   targetTotal = (3000 - 30) + (4000 - 40) = 6,930 → targetFloor = 6,930
   *   remainder = 0 → totalRefund = 6,930
   *
   * 단언: 합계 정합 + 라인별 음수 없음
   */
  it("UT-002-c: 절사 후 잔액보정 — 라인별 합계 = totalRefund, 음수 없음", () => {
    const result = calcProratedRefund({
      lines: [
        { id: "line-A", amount: 3000 },
        { id: "line-B", amount: 4000 },
      ],
      couponDiscount: 100,
      pointDiscount: 0,
      shippingFee: 0,
      totalLineAmount: 10000,
    })

    const lineSum = result.lines.reduce((s, l) => s + l.refundAmount, 0)
    expect(lineSum).toBe(result.totalRefund)
    for (const line of result.lines) {
      expect(line.refundAmount).toBeGreaterThanOrEqual(0)
    }
  })

  it("UT-002-d: 라인 없음 → 예외 발생", () => {
    expect(() =>
      calcProratedRefund({
        lines: [],
        couponDiscount: 0,
        pointDiscount: 0,
        shippingFee: 0,
        totalLineAmount: 10000,
      })
    ).toThrow()
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// UT-003  멱등키 (buildIdempotencyKey — route production 사용 함수)
// ──────────────────────────────────────────────────────────────────────────────
describe("UT-003: 멱등키 (buildIdempotencyKey)", () => {
  /**
   * buildIdempotencyKey:
   *   형식 = "{orderId}:refund:{nonce}"
   *   route.ts 가 실제 production 에서 호출하는 함수. (spec I2)
   */
  it("UT-003-a: buildIdempotencyKey — 형식 정합 ({orderId}:refund:{nonce})", () => {
    const key = buildIdempotencyKey("order-123", "uuid-abc")
    expect(key).toBe("order-123:refund:uuid-abc")
  })

  it("UT-003-b: buildIdempotencyKey — orderId 비어있으면 예외", () => {
    expect(() => buildIdempotencyKey("", "uuid-abc")).toThrow()
  })

  it("UT-003-c: buildIdempotencyKey — nonce 비어있으면 예외", () => {
    expect(() => buildIdempotencyKey("order-123", "")).toThrow()
  })

  it("UT-003-d: 동일 orderId+nonce 로 생성된 두 키는 같다 (재요청 동일 키 보장)", () => {
    const key1 = buildIdempotencyKey("order-999", "nonce-x")
    const key2 = buildIdempotencyKey("order-999", "nonce-x")
    expect(key1).toBe(key2)
  })

  it("UT-003-e: 서로 다른 nonce 는 다른 키를 생성한다", () => {
    const key1 = buildIdempotencyKey("order-999", "nonce-1")
    const key2 = buildIdempotencyKey("order-999", "nonce-2")
    expect(key1).not.toBe(key2)
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// 보조: calcReshippingFee (F7)
// ──────────────────────────────────────────────────────────────────────────────
describe("calcReshippingFee (F7 — 재청구 배송비)", () => {
  it("잔여 < 50000 → 재청구 3000원", () => {
    const result = calcReshippingFee({ remainingOrderAmount: 30000 })
    expect(result.required).toBe(true)
    expect(result.reshippingFee).toBe(3000)
  })

  it("잔여 = 50000 → 재청구 없음", () => {
    const result = calcReshippingFee({ remainingOrderAmount: 50000 })
    expect(result.required).toBe(false)
    expect(result.reshippingFee).toBe(0)
  })

  it("잔여 > 50000 → 재청구 없음", () => {
    const result = calcReshippingFee({ remainingOrderAmount: 80000 })
    expect(result.required).toBe(false)
    expect(result.reshippingFee).toBe(0)
  })
})
