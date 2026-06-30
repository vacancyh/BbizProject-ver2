/**
 * 재입고 알림 구독(RestockSubscription) 모델
 *  - 품절 상품/변형에 대해 고객이 재입고 알림을 신청한 구독 1건.
 *  - 재입고(재고 > 0) 감지 시 notified=true 로 전환 + 알림 발송(후속 job).
 * 가드레일: Medusa core 미수정. 본 모듈 전용 테이블만 사용.
 */
import { model } from "@medusajs/framework/utils"

const RestockSubscription = model.define("restock_subscription", {
  id: model.id({ prefix: "rsub" }).primaryKey(),
  // 대상 변형(Medusa variant.id)
  variant_id: model.text().index("IDX_restock_variant_id"),
  // 대상 상품(Medusa product.id, 표시용)
  product_id: model.text().nullable(),
  // 알림 받을 이메일
  email: model.text(),
  // 로그인 고객이면 customer_id
  customer_id: model.text().nullable(),
  // 알림 발송 완료 여부
  notified: model.boolean().default(false),
})

export default RestockSubscription
