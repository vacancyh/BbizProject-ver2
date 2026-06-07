/**
 * 환불 순수 로직 (DB·req 의존 없음)
 *
 * calcProratedRefund: 부분환불 시 쿠폰·포인트·배송비를 라인별 1원 단위 비례배분.
 *   - 절사(floor) + 잔액보정: 합계차액을 최대금액 라인에 더해 총 환불액 1원 정합.
 *   - 사장님 결정(S0 Q4): 반올림 정책 = 절사 + 잔액보정.
 *   - spec: t007_환불.md §1 F6, I3.
 *
 * calcReshippingFee: 환불 후 잔여 주문액 < 50,000원 시 배송비 재청구 산출.
 *   - spec: t007_환불.md §1 F7.
 *
 * spec: dag/d2_주문관리/t007_환불.md §1 F6·F7, §4 I1·I3
 */

/** 환불 라인 입력 */
export interface RefundLineInput {
  /** order line item id */
  id: string
  /** 라인 환불 요청 금액(원) */
  amount: number
}

/** 비례배분 입력 */
export interface ProratedRefundInput {
  /** 환불 대상 라인별 금액 */
  lines: RefundLineInput[]
  /** 전체 쿠폰 할인액(양수) — 라인별 비례 차감 대상 */
  couponDiscount: number
  /** 전체 포인트 사용액(양수) — 라인별 비례 차감 대상 */
  pointDiscount: number
  /** 배송비(양수) — 전체 환불 시에만 100% 포함, 부분환불 시 비례 배분 */
  shippingFee: number
  /** 전체 주문 라인 합계(비례 계산 기준) */
  totalLineAmount: number
}

/** 비례배분 결과 */
export interface ProratedRefundResult {
  /** 라인별 실제 환불액 (절사 + 잔액보정 적용) */
  lines: { id: string; refundAmount: number }[]
  /** 총 실제 환불액 */
  totalRefund: number
  /** 배송비 포함 여부(전액환불 = true) */
  shippingIncluded: boolean
}

/** 재청구 배송비 입력 */
export interface ReshippingFeeInput {
  /** 환불 후 잔여 주문 금액(원) */
  remainingOrderAmount: number
  /** 기본 배송비(원, 기본 3000) */
  defaultShippingFee?: number
  /** 무료배송 기준(원, 기본 50000) */
  freeShippingThreshold?: number
}

/** 재청구 배송비 결과 */
export interface ReshippingFeeResult {
  /** 재청구 배송비(0이면 재청구 없음) */
  reshippingFee: number
  /** 재청구 발생 여부 */
  required: boolean
}

/**
 * 부분환불 비례배분 계산 (절사 + 잔액보정).
 *
 * 계산식:
 *  각 라인 gross = amount - floor(coupon * amount / total) - floor(point * amount / total)
 *  shipping 비례: floor(shipping * amount / total) (부분환불 시)
 *  gross_with_ship = gross - shippingShare
 *  잔액보정: 각 라인 floor 합산 후 총 환불액과 차이(절사잔액)를 최대 금액 라인에 합산.
 *
 * 음수 방지: 각 라인 환불액 = Math.max(0, 계산값).
 * 검증: 환불액 ≤ (결제액 - 기환불액)은 route 에서 수행(caller 책임). 여기선 라인 합계만 보정.
 *
 * @param input ProratedRefundInput
 * @returns ProratedRefundResult
 * @throws Error 입력 라인 없음 / 음수 금액
 */
export function calcProratedRefund(input: ProratedRefundInput): ProratedRefundResult {
  const { lines, couponDiscount, pointDiscount, shippingFee, totalLineAmount } = input

  if (!lines || lines.length === 0) {
    throw new Error("[refund-logic] 환불 대상 라인이 없습니다.")
  }
  for (const l of lines) {
    if (l.amount < 0) {
      throw new Error(`[refund-logic] 라인(${l.id}) 금액이 음수입니다: ${l.amount}`)
    }
  }
  if (couponDiscount < 0 || pointDiscount < 0 || shippingFee < 0) {
    throw new Error("[refund-logic] 할인액/배송비가 음수입니다.")
  }
  if (totalLineAmount <= 0) {
    throw new Error("[refund-logic] totalLineAmount 가 0 이하입니다.")
  }

  const refundLineAmount = lines.reduce((s, l) => s + l.amount, 0)
  // 전액 환불 여부: 환불 라인 합계 = 전체 주문 라인 합계
  const isFullRefund = refundLineAmount >= totalLineAmount
  const shippingIncluded = isFullRefund

  // 라인별 절사 환불액 계산
  const rawAmounts: number[] = lines.map((l) => {
    const base = l.amount
    // 쿠폰·포인트: 전체 대비 비례 floor
    const couponShare = Math.floor((couponDiscount * base) / totalLineAmount)
    const pointShare = Math.floor((pointDiscount * base) / totalLineAmount)
    // 배송비: 전액환불이면 별도 합산, 부분환불이면 비례 포함
    const shippingShare = isFullRefund ? 0 : Math.floor((shippingFee * base) / totalLineAmount)
    const net = base - couponShare - pointShare - shippingShare
    return Math.max(0, net)
  })

  // 전액환불이면 배송비 전액 더하기(최대 라인에)
  let shippingBonus = isFullRefund ? shippingFee : 0

  // 잔액보정: 절사로 인한 합계 차이를 최대 금액 라인에 보정
  const sumRaw = rawAmounts.reduce((s, v) => s + v, 0)
  // 목표 총 환불액 계산 (절사 없이 순수 소수점 합계)
  const targetTotal = lines.reduce((s, l) => {
    const base = l.amount
    const couponShare = (couponDiscount * base) / totalLineAmount
    const pointShare = (pointDiscount * base) / totalLineAmount
    const shippingShare = isFullRefund ? 0 : (shippingFee * base) / totalLineAmount
    return s + Math.max(0, base - couponShare - pointShare - shippingShare)
  }, 0)
  const targetFloor = Math.floor(targetTotal) + (isFullRefund ? shippingFee : 0)
  const remainder = targetFloor - sumRaw

  // 최대 금액 라인 인덱스 찾기
  let maxIdx = 0
  for (let i = 1; i < rawAmounts.length; i++) {
    if (rawAmounts[i] > rawAmounts[maxIdx]) {
      maxIdx = i
    }
  }

  const finalAmounts = rawAmounts.map((v, i) => {
    let adj = v
    if (i === maxIdx) {
      adj += remainder + shippingBonus
      shippingBonus = 0 // 이미 더했음
    }
    return Math.max(0, adj)
  })

  const totalRefund = finalAmounts.reduce((s, v) => s + v, 0)

  return {
    lines: lines.map((l, i) => ({ id: l.id, refundAmount: finalAmounts[i] })),
    totalRefund,
    shippingIncluded,
  }
}

/**
 * 환불 후 잔여 주문액 < 5만원 시 배송비 재청구 산출.
 *
 * 계산식:
 *  remainingOrderAmount < freeShippingThreshold(50000) → reshippingFee = defaultShippingFee(3000)
 *  그 외 → 0
 *
 * spec: t007_환불.md §1 F7
 *
 * @param input ReshippingFeeInput
 * @returns ReshippingFeeResult
 */
export function calcReshippingFee(input: ReshippingFeeInput): ReshippingFeeResult {
  const {
    remainingOrderAmount,
    defaultShippingFee = 3000,
    freeShippingThreshold = 50000,
  } = input

  if (remainingOrderAmount < 0) {
    throw new Error("[refund-logic] remainingOrderAmount 가 음수입니다.")
  }

  const required = remainingOrderAmount < freeShippingThreshold
  return {
    reshippingFee: required ? defaultShippingFee : 0,
    required,
  }
}
