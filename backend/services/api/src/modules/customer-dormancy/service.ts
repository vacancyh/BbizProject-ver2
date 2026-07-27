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
}

export default CustomerDormancyModuleService
