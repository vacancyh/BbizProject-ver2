/**
 * 정산 지급(payout) 순수 로직 모듈 (백엔드 정본) — DB 의존 없음. (d7 정산 갭B)
 *
 * 정산 기간 스냅샷의 순정산 계산 + 지급 상태 전이 룰.
 * ★ 매출/환불/PG수수료 집계 자체는 admin lib(lib/settlement/settlement-logic.ts)의
 *   단일 진실 함수가 담당. 본 모듈은 그 결과(gross/refund/pgFee)를 받아 순정산 + 상태머신만 책임.
 *
 * 상태: open(집계중) → closed(마감) → paid(지급완료)
 */

/** 정산 지급 상태 (순서 고정) */
export const PAYOUT_STATUSES = ["open", "closed", "paid"] as const
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number]

/** 순정산액 = 매출 - 환불 - PG수수료 (음수 허용: 환불 초과 시 차감 정산). */
export function calcNet(gross: number, refund: number, pgFee: number): number {
  return gross - refund - pgFee
}

/**
 * PG 수수료 계산 — 매출(캡처액) × 수수료율(%). 내림.
 * 수수료율은 정책(settlement.pg_fee_rate)에서 주입(Rule One — 미확정 시 0).
 */
export function calcPgFee(grossCaptured: number, ratePercent: number): number {
  if (!(ratePercent >= 0 && ratePercent <= 100)) {
    throw new Error("PG 수수료율은 0~100% 여야 합니다")
  }
  return Math.floor((grossCaptured * ratePercent) / 100)
}

/** 지급 상태 전이 허용표 — open→closed, closed→paid(또는 open 으로 되돌림 재집계). */
const PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  open: ["closed"],
  closed: ["paid", "open"], // 마감 후 재집계 위해 open 으로 되돌림 허용
  paid: [], // 지급완료는 종료 상태
}

/** 상태 전이 가능 여부. */
export function canTransitionPayout(from: PayoutStatus, to: PayoutStatus): boolean {
  return (PAYOUT_TRANSITIONS[from] ?? []).includes(to)
}
