import { MedusaService } from "@medusajs/framework/utils"
import CustomerActivity from "./models/customer-activity"
import { classifyDormancy } from "./logic"

class CustomerDormancyModuleService extends MedusaService({
  CustomerActivity,
}) {
  /** 고객 활동시각 갱신(로그인·마이페이지 접근 시). 없으면 생성. */
  async touch(customerId: string, at: Date = new Date()): Promise<void> {
    if (!customerId) return
    const rows = await this.listCustomerActivities({ customer_id: customerId })
    if (rows.length) {
      await this.updateCustomerActivities([{ id: rows[0].id, last_active_at: at }])
    } else {
      await this.createCustomerActivities([
        { customer_id: customerId, last_active_at: at },
      ])
    }
  }

  /** 휴면/임박 고객 id 목록. */
  async classify(
    now: number = Date.now(),
    dormantDays = 365,
    warnDays = 335
  ): Promise<{ dormant: string[]; atRisk: string[] }> {
    const rows = await this.listCustomerActivities({})
    return classifyDormancy(
      rows.map((r: any) => ({
        customer_id: r.customer_id as string,
        last_active_at: r.last_active_at as Date,
      })),
      now,
      dormantDays,
      warnDays
    )
  }

  /**
   * 휴면 파이프라인 1회 실행(스케줄 job 에서 호출) — PIPA 사전통지·분리보관·파기 흐름의 진입점.
   *
   * 현재 구현 범위:
   *  - classify() 로 사전통지(atRisk)·휴면(dormant) 대상 산출
   *  - 요약 반환(호출측이 로깅/이벤트 emit) — 실제 알림 발송·분리보관·파기는
   *    알림 provider / 분리 스토리지 정책 연동 지점(TODO). 무단 파기 방지 위해 자동 삭제는 하지 않음.
   */
  async runPipeline(
    now: number = Date.now(),
    dormantDays = 365,
    warnDays = 335
  ): Promise<{ atRisk: string[]; dormant: string[]; checkedAt: string }> {
    const { atRisk, dormant } = await this.classify(now, dormantDays, warnDays)
    return { atRisk, dormant, checkedAt: new Date(now).toISOString() }
  }
}

export default CustomerDormancyModuleService
