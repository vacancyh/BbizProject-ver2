/**
 * 정산 지급 모듈 서비스 — 기간 스냅샷 upsert + 마감/지급 상태 전이.
 *
 * 주요 메서드:
 *  - upsertSnapshot(periodKey, {gross, refund, pgFee}) = 집계 스냅샷 저장(순정산 계산), 상태 open
 *  - closePeriod(periodKey)                            = open→closed (마감)
 *  - payPeriod(periodKey)                              = closed→paid (지급완료)
 *  - reopenPeriod(periodKey)                           = closed→open (재집계)
 *  - getPeriod / listPeriods
 *
 * 순정산/상태전이 룰은 logic.ts(순수함수) 위임(§V0 단일 진실).
 * 실지급(PG 송금 등) 외부 연동은 deferred — 본 모듈은 지급 상태/스냅샷 영속만.
 */
import { MedusaService } from "@medusajs/framework/utils"
import SettlementPayout from "./models/settlement-payout"
import { PayoutStatus, calcNet, canTransitionPayout } from "./logic"

export type SnapshotInput = {
  gross: number
  refund: number
  pgFee: number
  memo?: string | null
}

class SettlementPayoutModuleService extends MedusaService({
  SettlementPayout,
}) {
  /**
   * 숫자 필드 정규화 — PostgreSQL numeric 컬럼은 DB 재조회 시 string 으로 오므로
   * 응답 일관성(§V0)을 위해 number 로 변환. (membership/point service 와 동일 규약)
   */
  private toView(row: any): any {
    if (!row) return row
    return {
      ...row,
      gross_amount: Number(row.gross_amount),
      refund_amount: Number(row.refund_amount),
      pg_fee: Number(row.pg_fee),
      net_amount: Number(row.net_amount),
    }
  }

  /** 기간 1건 조회(없으면 null). */
  async getPeriod(periodKey: string): Promise<any | null> {
    const rows = await this.listSettlementPayouts({ period_key: periodKey })
    return rows.length ? this.toView(rows[0]) : null
  }

  /** 기간 목록(최신 키 내림차순). */
  async listPeriods(): Promise<any[]> {
    const rows = await this.listSettlementPayouts({}, { order: { period_key: "DESC" } })
    return rows.map((r: any) => this.toView(r))
  }

  /** 집계 스냅샷 저장(순정산 계산). 기존 있으면 update(단 paid 상태면 거부). */
  async upsertSnapshot(periodKey: string, input: SnapshotInput): Promise<any> {
    const net = calcNet(input.gross, input.refund, input.pgFee)
    const ex = await this.getPeriod(periodKey)
    if (ex) {
      if (ex.status === "paid") {
        throw new Error(`[settlement] 지급완료된 기간은 수정할 수 없습니다: ${periodKey}`)
      }
      const [u] = await this.updateSettlementPayouts([
        {
          id: ex.id,
          gross_amount: input.gross,
          refund_amount: input.refund,
          pg_fee: input.pgFee,
          net_amount: net,
          memo: input.memo ?? ex.memo ?? null,
        },
      ])
      return this.toView(u)
    }
    const [c] = await this.createSettlementPayouts([
      {
        period_key: periodKey,
        gross_amount: input.gross,
        refund_amount: input.refund,
        pg_fee: input.pgFee,
        net_amount: net,
        status: "open",
        memo: input.memo ?? null,
      },
    ])
    return this.toView(c)
  }

  /** 상태 전이 공통(허용표 검증). */
  private async transition(
    periodKey: string,
    to: PayoutStatus,
    patch: Record<string, unknown> = {}
  ): Promise<any> {
    const ex = await this.getPeriod(periodKey)
    if (!ex) throw new Error(`[settlement] 존재하지 않는 정산 기간: ${periodKey}`)
    const from = ex.status as PayoutStatus
    if (!canTransitionPayout(from, to)) {
      throw new Error(`[settlement] 허용되지 않는 상태 전이: ${from} → ${to}`)
    }
    const [u] = await this.updateSettlementPayouts([{ id: ex.id, status: to, ...patch }])
    return this.toView(u)
  }

  /** 마감 open→closed. */
  async closePeriod(periodKey: string, closedAtIso: string): Promise<any> {
    return this.transition(periodKey, "closed", { closed_at: closedAtIso })
  }

  /** 지급완료 closed→paid. */
  async payPeriod(periodKey: string, paidAtIso: string): Promise<any> {
    return this.transition(periodKey, "paid", { paid_at: paidAtIso })
  }

  /** 재집계 closed→open. */
  async reopenPeriod(periodKey: string): Promise<any> {
    return this.transition(periodKey, "open", { closed_at: null })
  }

  /** 기간 삭제(정리/오등록 회수용). */
  async deletePeriod(periodKey: string): Promise<boolean> {
    const ex = await this.getPeriod(periodKey)
    if (!ex) return false
    await this.deleteSettlementPayouts([ex.id])
    return true
  }
}

export default SettlementPayoutModuleService
