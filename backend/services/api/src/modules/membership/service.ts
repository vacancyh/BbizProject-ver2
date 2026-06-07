/**
 * 멤버십 모듈 서비스 — 고객별 누적금액·등급 영속 + 룰 기반 재산정.
 *
 * 주요 메서드:
 *  - getMembership(customerId)                  = 고객 멤버십 1건(없으면 null)
 *  - getOrDefault(customerId, tiers)            = 없으면 일반/0 디폴트 객체 반환(미생성)
 *  - recordAccrual(customerId, amount, tiers)   = 누적 증가 후 등급 재산정(upsert)
 *  - applyRefund(customerId, refundAmount, tiers) = 환불 차감 후 등급 재산정
 *  - setTier(customerId, tierName, tiers)       = 수동 등급 조정(누적금액은 유지)
 *
 * 등급 산정 룰은 logic.ts(순수함수) 위임 — DB 입출력만 본 서비스가 담당(§V0 책임 분리).
 * 정책(tiers)은 모듈 간 직접 의존을 피하기 위해 호출측(route)이 policy 모듈에서 조회하여 주입한다.
 */
import { MedusaService } from "@medusajs/framework/utils"
import CustomerMembership from "./models/customer-membership"
import {
  TierPolicy,
  calcMembershipTier,
  recalcAccruedOnRefund,
} from "./logic"

export type MembershipSnapshot = {
  customer_id: string
  accrued_amount: number
  current_tier: string
  last_change_reason: string | null
}

class MembershipModuleService extends MedusaService({
  CustomerMembership,
}) {
  /** 고객 멤버십 1건 조회(없으면 null). */
  async getMembership(customerId: string): Promise<any | null> {
    const ex = await this.listCustomerMemberships({ customer_id: customerId })
    return ex.length ? ex[0] : null
  }

  /**
   * 멤버십 조회 — 없으면 최저 등급/0 누적의 디폴트 스냅샷을 반환(DB 미생성).
   * 조회 전용 화면에서 미가입 고객도 등급을 표시하기 위함.
   */
  async getOrDefault(customerId: string, tiers: TierPolicy): Promise<MembershipSnapshot> {
    const ex = await this.getMembership(customerId)
    if (ex) {
      return {
        customer_id: customerId,
        accrued_amount: Number(ex.accrued_amount),
        current_tier: ex.current_tier,
        last_change_reason: ex.last_change_reason ?? null,
      }
    }
    const tier = calcMembershipTier(0, tiers)
    return {
      customer_id: customerId,
      accrued_amount: 0,
      current_tier: tier.name,
      last_change_reason: null,
    }
  }

  /**
   * 누적 적립금액 증가 후 등급 재산정(upsert).
   * @param amount 이번에 누적할 금액(0 이상으로 보정)
   */
  async recordAccrual(
    customerId: string,
    amount: number,
    tiers: TierPolicy
  ): Promise<MembershipSnapshot> {
    const ex = await this.getMembership(customerId)
    const prev = ex ? Number(ex.accrued_amount) : 0
    const next = prev + Math.max(0, amount)
    const tier = calcMembershipTier(next, tiers)
    if (ex) {
      const [u] = await this.updateCustomerMemberships([
        {
          id: ex.id,
          accrued_amount: next,
          current_tier: tier.name,
          last_change_reason: "accrual",
        },
      ])
      return this.toSnapshot(customerId, u)
    }
    const [c] = await this.createCustomerMemberships([
      {
        customer_id: customerId,
        accrued_amount: next,
        current_tier: tier.name,
        last_change_reason: "accrual",
      },
    ])
    return this.toSnapshot(customerId, c)
  }

  /**
   * 환불 시 누적금액 차감 후 등급 재산정(하향 가능).
   * @throws 멤버십 미존재 시 에러
   */
  async applyRefund(
    customerId: string,
    refundAmount: number,
    tiers: TierPolicy
  ): Promise<MembershipSnapshot> {
    const ex = await this.getMembership(customerId)
    if (!ex) throw new Error(`[membership] 멤버십이 없습니다: ${customerId}`)
    const next = recalcAccruedOnRefund(Number(ex.accrued_amount), refundAmount)
    const tier = calcMembershipTier(next, tiers)
    const [u] = await this.updateCustomerMemberships([
      {
        id: ex.id,
        accrued_amount: next,
        current_tier: tier.name,
        last_change_reason: "refund",
      },
    ])
    return this.toSnapshot(customerId, u)
  }

  /** 모델 row → 스냅샷 변환(숫자 정규화). */
  private toSnapshot(customerId: string, row: any): MembershipSnapshot {
    return {
      customer_id: customerId,
      accrued_amount: Number(row.accrued_amount),
      current_tier: row.current_tier,
      last_change_reason: row.last_change_reason ?? null,
    }
  }
}

export default MembershipModuleService
