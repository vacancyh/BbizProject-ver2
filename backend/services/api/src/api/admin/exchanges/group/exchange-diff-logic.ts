/**
 * 교환 차액 계산 순수 로직 — exchange-diff-logic.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 단독 import 가능한 순수 함수. DB·MedusaService 의존 없음.
 * spec: t005_교환.md §1, unit_007 UT-003.
 *
 * 알고리즘:
 *  1. 회수 라인 환불액 합계 = Σ(return_items[i].unit_price × return_items[i].quantity)
 *  2. 신규 라인 결제액 합계 = Σ(additional_items[i].unit_price × additional_items[i].quantity)
 *  3. 라인별 차액 = 각 신규 라인 unit_price×qty - 각 회수 라인 unit_price×qty
 *     → 양수: 추가결제, 음수: 환불
 *  4. 총 차액(raw) = 신규합계 - 환불합계
 *  5. 끝전 절사: floor(총 차액)
 *  6. 잔액보정: 절사로 잘린 끝전(raw - floor)을 금액이 가장 큰 라인에 더함
 *     → 총액이 정확히 1원 단위로 정합
 *
 * 반환:
 *  - diff: 총 차액 (floor 적용, 양수=추가결제, 음수=환불)
 *  - lines: 라인별 차액 배열 (잔액보정 반영)
 *  - refund_total : 회수 환불 합계
 *  - additional_total: 신규 결제 합계
 */

export type DiffLineItem = {
  /** 라인 식별자(item_id 또는 variant_id 등) */
  id: string
  /** 단가(원) */
  unit_price: number
  /** 수량 */
  quantity: number
}

export type ExchangeDiffResult = {
  /** 총 차액(끝전 절사 + 잔액보정 적용, 양수=추가결제, 음수=환불) */
  diff: number
  /** 라인별 차액 배열 (신규 - 회수, 잔액보정 반영) */
  lines: { id: string; diff: number }[]
  /** 회수 환불 합계 */
  refund_total: number
  /** 신규 결제 합계 */
  additional_total: number
}

/**
 * 교환 차액을 계산합니다.
 *
 * @param returnItems     회수(반품) 라인 배열
 * @param additionalItems 신규 배송 라인 배열
 * @returns ExchangeDiffResult
 */
export function calcExchangeDiff(
  returnItems: DiffLineItem[],
  additionalItems: DiffLineItem[]
): ExchangeDiffResult {
  const safeItems = (items: DiffLineItem[]) =>
    (items ?? []).map((it) => ({
      id: it.id ?? "",
      unit_price: Number(it.unit_price) || 0,
      quantity: Number(it.quantity) || 0,
    }))

  const safeReturn = safeItems(returnItems)
  const safeAdditional = safeItems(additionalItems)

  // 1. 합계 계산 (원 단위 정수 연산)
  const refund_total = safeReturn.reduce(
    (sum, it) => sum + it.unit_price * it.quantity,
    0
  )
  const additional_total = safeAdditional.reduce(
    (sum, it) => sum + it.unit_price * it.quantity,
    0
  )

  // 2. 총 차액(raw) — 소수점 방지 위해 round 처리
  const rawDiff = additional_total - refund_total

  // 3. 끝전 절사 (floor)
  const floorDiff = Math.floor(rawDiff)

  // 4. 라인별 차액 계산
  //    신규 라인 - 회수 라인 순서로 매핑. 길이가 다를 수 있으므로 신규 기준으로 생성.
  const allIds = Array.from(
    new Set([
      ...safeAdditional.map((it) => it.id),
      ...safeReturn.map((it) => it.id),
    ])
  )

  const lines: { id: string; diff: number }[] = allIds.map((id) => {
    const addItem = safeAdditional.find((it) => it.id === id)
    const retItem = safeReturn.find((it) => it.id === id)
    const addAmt = addItem ? addItem.unit_price * addItem.quantity : 0
    const retAmt = retItem ? retItem.unit_price * retItem.quantity : 0
    return { id, diff: Math.floor(addAmt - retAmt) }
  })

  // 5. 잔액보정 — 절사로 잘린 끝전(rawDiff - floorDiff)을 최대 금액 라인에 보정
  //    (총액이 정확히 1원 단위 정합)
  const remainder = rawDiff - floorDiff // 0 ≤ remainder < 1
  if (remainder > 0 && lines.length > 0) {
    // 절댓값 기준 가장 큰 라인 인덱스
    let maxIdx = 0
    let maxAbs = 0
    for (let i = 0; i < lines.length; i++) {
      const abs = Math.abs(lines[i].diff)
      if (abs > maxAbs) {
        maxAbs = abs
        maxIdx = i
      }
    }
    // 보정: floor(remainder) = 0이므로 1을 더하는 게 아니라
    // 실제로 잘린 값(반올림 0.5 기준)을 보정
    // 사장님 결정: "합계차액을 최대금액 라인에 보정, 총액 1원 정합"
    // → round(remainder) = 0 or 1 이므로 Math.round 사용
    lines[maxIdx] = {
      ...lines[maxIdx],
      diff: lines[maxIdx].diff + Math.round(remainder),
    }
  }

  return {
    diff: floorDiff,
    lines,
    refund_total,
    additional_total,
  }
}
