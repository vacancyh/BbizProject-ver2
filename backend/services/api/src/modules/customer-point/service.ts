/**
 * 포인트 모듈 서비스 — 원장 적재 + 잔액 계산 + 사용 검증 + 멱등 체크.
 *
 * 주요 메서드:
 *  - earnPoints(customerId, points, opts)                                        = 적립 1행 적재(유효기간 부여)
 *  - earnFromPurchase(customerId, amount, rate, validDays, earnedAtIso)          = 구매금액→포인트 적립
 *  - earnFromPurchaseIdempotent(customerId, orderId, amount, rate, validDays)    = 멱등 포인트 적립(중복 차단)
 *  - redeemPoints(customerId, useAmount)                                         = 잔액 검증 후 사용 1행(-) 적재
 *  - getBalance(customerId)                                                      = 원장 합산 잔액(0 바닥)
 *  - listLedger(customerId)                                                      = 원장(최신순)
 *  - expiringSoon(customerId, nowIso, days)                                      = 소멸 임박(D-N) earn 항목
 *  - hasAccrualLog(orderId, reason)                                              = 적립 이력 존재 여부
 *
 * 계산 룰은 logic.ts(순수함수) 위임(§V0 단일 진실). 자동 소멸 cron 은 deferred.
 */
import { MedusaService } from "@medusajs/framework/utils"
import PointLedger from "./models/point-ledger"
import PointAccrualLog from "./models/point-accrual-log"
import {
  PointLedgerEntry,
  calcPointsEarn,
  calcExpiryDate,
  calcBalanceFromLedger,
  canRedeemPoints,
  isExpiringWithin,
} from "./logic"

export type EarnOptions = {
  validDays: number
  earnedAtIso: string
  reason?: string | null
}

class CustomerPointModuleService extends MedusaService({
  PointLedger,
  PointAccrualLog,
}) {
  /** 적립 1행 적재(유효기간 부여). */
  async earnPoints(customerId: string, points: number, opts: EarnOptions): Promise<any> {
    if (!Number.isFinite(points) || points <= 0) {
      throw new Error("적립 포인트는 1 이상이어야 합니다")
    }
    const expiresAt = calcExpiryDate(opts.earnedAtIso, opts.validDays)
    const [row] = await this.createPointLedgers([
      {
        customer_id: customerId,
        entry_type: "earn",
        amount: points,
        reason: opts.reason ?? "manual",
        expires_at: expiresAt,
      },
    ])
    return row
  }

  /** 구매금액 × 적립률 → 포인트 적립(내림). */
  async earnFromPurchase(
    customerId: string,
    amount: number,
    ratePercent: number,
    validDays: number,
    earnedAtIso: string,
    reason: string = "purchase"
  ): Promise<any> {
    const points = calcPointsEarn(amount, ratePercent)
    if (points <= 0) {
      // 적립 0이면 원장 미적재(노이즈 방지)
      return { customer_id: customerId, entry_type: "earn", amount: 0, skipped: true }
    }
    return this.earnPoints(customerId, points, { validDays, earnedAtIso, reason })
  }

  /** 잔액 검증 후 사용 1행(음수) 적재. */
  async redeemPoints(customerId: string, useAmount: number, reason: string = "redeem"): Promise<any> {
    const balance = await this.getBalance(customerId)
    const check = canRedeemPoints(balance, useAmount)
    if (!check.ok) {
      throw new Error(`[point] ${check.reason}`)
    }
    const [row] = await this.createPointLedgers([
      {
        customer_id: customerId,
        entry_type: "redeem",
        amount: -useAmount,
        reason,
        expires_at: null,
      },
    ])
    return { ...row, balance_after: check.nextBalance }
  }

  /** 원장 합산 잔액(0 바닥). */
  async getBalance(customerId: string): Promise<number> {
    const rows = await this.listPointLedgers({ customer_id: customerId })
    const entries: PointLedgerEntry[] = rows.map((r: any) => ({
      type: r.entry_type,
      amount: Number(r.amount),
      expiresAt: r.expires_at ?? null,
    }))
    return calcBalanceFromLedger(entries)
  }

  /** 원장(최신순). numeric→string 방지 위해 amount 정규화(§V0). */
  async listLedger(customerId: string): Promise<any[]> {
    const rows = await this.listPointLedgers(
      { customer_id: customerId },
      { order: { created_at: "DESC" } }
    )
    return rows.map((r: any) => ({ ...r, amount: Number(r.amount) }))
  }

  /** 소멸 임박(D-N) earn 항목. amount 정규화(§V0). */
  async expiringSoon(customerId: string, nowIso: string, days: number): Promise<any[]> {
    const rows = await this.listPointLedgers({ customer_id: customerId, entry_type: "earn" })
    return rows
      .filter((r: any) => r.expires_at && isExpiringWithin(r.expires_at, nowIso, days))
      .map((r: any) => ({ ...r, amount: Number(r.amount) }))
  }

  /**
   * 멱등 포인트 적립 — 동일 orderId + reason 중복 적립 차단.
   *
   * 처리 흐름:
   *  1. point_accrual_log 에서 (orderId, reason) 이력 조회
   *  2. 이미 처리된 경우 → 기존 로그 반환(skipped = true)
   *  3. 미처리 → 포인트 적립 + 로그 1행 기록
   *
   * @param customerId Medusa customer.id
   * @param orderId    Medusa order.id (멱등 키)
   * @param amount     구매금액(원)
   * @param ratePercent 적립률(%)
   * @param validDays  포인트 유효기간(일)
   * @param reason     적립 사유(기본값 "purchase")
   */
  async earnFromPurchaseIdempotent(
    customerId: string,
    orderId: string,
    amount: number,
    ratePercent: number,
    validDays: number,
    reason: string = "purchase"
  ): Promise<{ skipped: boolean; points_earned: number; ledger_id: string | null }> {
    // ① 중복 체크 — 삭제되지 않은 로그 행 조회
    const existing = await this.listPointAccrualLogs({ order_id: orderId, reason })
    if (existing.length > 0) {
      // 이미 처리된 주문 — 중복 적립 차단
      const log = existing[0]
      return {
        skipped: true,
        points_earned: Number(log.points_earned),
        ledger_id: log.ledger_id ?? null,
      }
    }

    // ② 포인트 계산 + 적립
    const points = calcPointsEarn(amount, ratePercent)
    let ledgerId: string | null = null

    if (points > 0) {
      const earned = await this.earnFromPurchase(
        customerId,
        amount,
        ratePercent,
        validDays,
        new Date().toISOString(),
        reason
      )
      ledgerId = earned?.id ?? null
    }

    // ③ 멱등 로그 1행 기록 (0 포인트도 처리 완료로 기록 — 재시도 차단)
    await this.createPointAccrualLogs([
      {
        order_id: orderId,
        customer_id: customerId,
        reason,
        points_earned: points,
        ledger_id: ledgerId,
      },
    ])

    return { skipped: false, points_earned: points, ledger_id: ledgerId }
  }

  /**
   * 적립 이력 존재 여부 확인(조회 전용).
   * @returns true = 이미 처리됨(중복), false = 미처리
   */
  async hasAccrualLog(orderId: string, reason: string): Promise<boolean> {
    const rows = await this.listPointAccrualLogs({ order_id: orderId, reason })
    return rows.length > 0
  }
}

export default CustomerPointModuleService
