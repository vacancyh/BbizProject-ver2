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
    // ① 중복 체크(빠른 경로) — 삭제되지 않은 로그 행 조회
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

    const points = calcPointsEarn(amount, ratePercent)

    // ② 멱등 토큰을 **원장보다 먼저** 선점한다.
    //    (2026-08-03 재점검) 이전에는 원장 적립 → 로그 기록 순서였다. 동일 주문 이벤트가
    //    동시에 두 번 처리되면 둘 다 ①을 통과해 **원장에 2행 적립**되고, 나중 것만
    //    UNIQUE(order_id, reason) 위반으로 실패했다. 즉 "멱등"이 아니었다.
    //    로그를 먼저 넣으면 중복 요청은 여기서 DB 제약에 막혀 원장을 건드리지 못한다.
    let logId: string | null = null
    try {
      const [created] = await this.createPointAccrualLogs([
        {
          order_id: orderId,
          customer_id: customerId,
          reason,
          points_earned: points,
          ledger_id: null,
        },
      ])
      logId = created?.id ?? null
    } catch {
      // UNIQUE 위반 = 다른 처리가 이미 선점 → 중복으로 간주하고 적립하지 않는다.
      const again = await this.listPointAccrualLogs({ order_id: orderId, reason })
      const log = again[0]
      return {
        skipped: true,
        points_earned: log ? Number(log.points_earned) : 0,
        ledger_id: log?.ledger_id ?? null,
      }
    }

    // ③ 실제 원장 적립
    let ledgerId: string | null = null
    try {
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
    } catch (e) {
      // 원장 적립 실패 → 선점한 토큰을 반납해야 재시도가 가능하다.
      // (반납하지 않으면 "처리됨"으로 남아 고객 적립금이 영구히 누락된다)
      if (logId) {
        await this.deletePointAccrualLogs([logId]).catch(() => {})
      }
      throw e
    }

    // ④ 원장 id 연결
    if (logId && ledgerId) {
      await this.updatePointAccrualLogs([{ id: logId, ledger_id: ledgerId }]).catch(() => {})
    }

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

  /** 주문의 특정 사유 적립 포인트(기본 purchase). 없으면 0. */
  async getAccrualPointsEarned(orderId: string, reason: string = "purchase"): Promise<number> {
    const rows = await this.listPointAccrualLogs({ order_id: orderId, reason })
    return rows.length ? Number(rows[0].points_earned) || 0 : 0
  }

  /**
   * 환불/취소 역적립(보안점검 2026-07-27 A1) — 적립 포인트를 회수한다.
   *  - reverseReasonKey 기준 멱등(point_accrual_log UNIQUE(order_id, reason)): 이미 처리 시 skip.
   *  - 이미 사용한 적립금은 잔액 0에서 바닥(음수 미허용) — 회수액 = min(요청, 현재잔액).
   * @returns { skipped, reversed(실제 회수 포인트) }
   */
  async reverseAccrualForOrder(
    customerId: string,
    orderId: string,
    reverseReasonKey: string,
    pointsToReverse: number
  ): Promise<{ skipped: boolean; reversed: number }> {
    const existing = await this.listPointAccrualLogs({ order_id: orderId, reason: reverseReasonKey })
    if (existing.length > 0) return { skipped: true, reversed: 0 }

    const balance = await this.getBalance(customerId)
    const deduct = Math.max(0, Math.min(Math.floor(pointsToReverse), balance)) // 잔액 0 바닥
    if (deduct > 0) {
      await this.createPointLedgers([
        {
          customer_id: customerId,
          entry_type: "redeem",
          amount: -deduct,
          reason: "환불 적립금 회수",
          expires_at: null,
        },
      ])
    }
    // 멱등 마커(회수액 음수로 기록)
    await this.createPointAccrualLogs([
      {
        order_id: orderId,
        customer_id: customerId,
        reason: reverseReasonKey,
        points_earned: -deduct,
        ledger_id: null,
      },
    ])
    return { skipped: false, reversed: deduct }
  }
}

export default CustomerPointModuleService
