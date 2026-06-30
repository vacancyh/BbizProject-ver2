/**
 * 재입고 알림 모듈 서비스.
 *  - subscribe(input) = 구독 1건 등록(동일 variant+email 미알림 중복은 기존 반환)
 *  - listPending(variantId) = 특정 변형의 미알림 구독(재입고 감지 시 사용)
 */
import { MedusaService } from "@medusajs/framework/utils"
import RestockSubscription from "./models/restock-subscription"

class RestockNotificationModuleService extends MedusaService({
  RestockSubscription,
}) {
  async subscribe(input: {
    variant_id: string
    product_id?: string | null
    email: string
    customer_id?: string | null
  }): Promise<any> {
    // 동일 variant+email 의 미알림 구독이 있으면 중복 등록하지 않음
    const existing = await this.listRestockSubscriptions({
      variant_id: input.variant_id,
      email: input.email,
      notified: false,
    })
    if (existing && existing.length > 0) {
      return existing[0]
    }
    const [created] = await this.createRestockSubscriptions([
      {
        variant_id: input.variant_id,
        product_id: input.product_id ?? null,
        email: input.email,
        customer_id: input.customer_id ?? null,
        notified: false,
      },
    ])
    return created
  }

  async listPending(variantId: string): Promise<any[]> {
    return this.listRestockSubscriptions({
      variant_id: variantId,
      notified: false,
    })
  }
}

export default RestockNotificationModuleService
