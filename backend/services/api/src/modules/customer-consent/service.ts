/**
 * 동의 이력 모듈 서비스 — 동의/철회 적재 + 채널별 현재 상태/재확인 판정.
 *
 * 주요 메서드:
 *  - recordConsent(customerId, channel, agreed, recordedAtIso) = 동의/철회 1행 적재
 *  - getRecords(customerId)                                    = 전체 이력
 *  - getStatus(customerId, nowIso, channels?)                  = 채널별 동의 + 재확인 필요
 *
 * 최신/재확인 룰은 logic.ts(순수함수) 위임(§V0 단일 진실). 재확인 추출 job 은 deferred.
 */
import { MedusaService } from "@medusajs/framework/utils"
import ConsentLog from "./models/consent-log"
import {
  ConsentChannel,
  ConsentRecord,
  ALL_CONSENT_CHANNELS,
  isConsented,
  channelsNeedingReconsent,
} from "./logic"

class CustomerConsentModuleService extends MedusaService({
  ConsentLog,
}) {
  /** 동의/철회 1행 적재. */
  async recordConsent(
    customerId: string,
    channel: ConsentChannel,
    agreed: boolean,
    recordedAtIso: string
  ): Promise<any> {
    const [row] = await this.createConsentLogs([
      {
        customer_id: customerId,
        channel,
        agreed,
        recorded_at: recordedAtIso,
      },
    ])
    return row
  }

  /** 전체 이력 → ConsentRecord[]. */
  async getRecords(customerId: string): Promise<ConsentRecord[]> {
    const rows = await this.listConsentLogs({ customer_id: customerId })
    return rows.map((r: any) => ({
      channel: r.channel as ConsentChannel,
      agreed: !!r.agreed,
      recordedAt: r.recorded_at,
    }))
  }

  /** 채널별 현재 동의 + 재확인 필요 채널. */
  async getStatus(
    customerId: string,
    nowIso: string,
    channels: ConsentChannel[] = ALL_CONSENT_CHANNELS
  ): Promise<{
    consents: Record<string, boolean>
    needs_reconsent: ConsentChannel[]
  }> {
    const records = await this.getRecords(customerId)
    const consents: Record<string, boolean> = {}
    for (const ch of channels) {
      consents[ch] = isConsented(records, ch)
    }
    return {
      consents,
      needs_reconsent: channelsNeedingReconsent(records, channels, nowIso),
    }
  }
}

export default CustomerConsentModuleService
