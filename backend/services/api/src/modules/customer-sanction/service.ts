/**
 * 제재 모듈 서비스 — 단계 상승 적재 + 현재 상태/차단 판정 + 해제.
 *
 * 주요 메서드:
 *  - applySanction(customerId, reason, startAtIso) = 현재 단계 다음으로 상승 적재
 *  - getCurrent(customerId, nowIso)                = 최신 제재 + 활성/차단 판정
 *  - liftSanction(customerId)                      = 최신 활성 제재 해제(active=false)
 *
 * 단계 전이/차단 룰은 logic.ts(순수함수) 위임(§V0 단일 진실).
 * 진행중 주문 강제취소 연동은 갭B 후속(deferred).
 */
import { MedusaService } from "@medusajs/framework/utils"
import CustomerSanction from "./models/customer-sanction"
import {
  SanctionLevel,
  getNextSanctionLevel,
  calcSanctionUntil,
  isSanctionActive,
  shouldBlockLogin,
} from "./logic"

export type SanctionStatus = {
  customer_id: string
  level: SanctionLevel | null
  until_at: string | null
  active: boolean
  is_active_sanction: boolean
  login_blocked: boolean
}

class CustomerSanctionModuleService extends MedusaService({
  CustomerSanction,
}) {
  /** 최신 제재 1행(해제 포함). */
  async getLatest(customerId: string): Promise<any | null> {
    const rows = await this.listCustomerSanctions(
      { customer_id: customerId },
      { order: { created_at: "DESC" }, take: 1 }
    )
    return rows.length ? rows[0] : null
  }

  /**
   * 제재 단계 상승 적용. 첫 제재=warn, 이후 다음 단계로 상승.
   * 해제된 직전 제재가 있어도 마지막 단계 기준으로 상승(누적 제재 정책).
   */
  async applySanction(customerId: string, reason: string, startAtIso: string): Promise<any> {
    const latest = await this.getLatest(customerId)
    const next: SanctionLevel = latest
      ? getNextSanctionLevel(latest.level as SanctionLevel)
      : "warn"
    const until = calcSanctionUntil(next, startAtIso)
    const [row] = await this.createCustomerSanctions([
      {
        customer_id: customerId,
        level: next,
        reason,
        started_at: startAtIso,
        until_at: until,
        active: true,
      },
    ])
    return row
  }

  /** 현재 제재 상태 + 활성/차단 판정. */
  async getCurrent(customerId: string, nowIso: string): Promise<SanctionStatus> {
    const latest = await this.getLatest(customerId)
    if (!latest) {
      return {
        customer_id: customerId,
        level: null,
        until_at: null,
        active: false,
        is_active_sanction: false,
        login_blocked: false,
      }
    }
    const level = latest.level as SanctionLevel
    const activeFlag = !!latest.active
    const isActive = activeFlag && isSanctionActive(level, latest.until_at ?? null, nowIso)
    const blocked = activeFlag && shouldBlockLogin(level, latest.until_at ?? null, nowIso)
    return {
      customer_id: customerId,
      level,
      until_at: latest.until_at ?? null,
      active: activeFlag,
      is_active_sanction: isActive,
      login_blocked: blocked,
    }
  }

  /** 최신 활성 제재 해제(active=false). */
  async liftSanction(customerId: string): Promise<any | null> {
    const latest = await this.getLatest(customerId)
    if (!latest || !latest.active) return null
    const [row] = await this.updateCustomerSanctions([{ id: latest.id, active: false }])
    return row
  }
}

export default CustomerSanctionModuleService
