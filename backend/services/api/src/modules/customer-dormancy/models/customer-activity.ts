/**
 * 고객 활동시각(CustomerActivity) — 휴면계정 판정용 마지막 활동 시각.
 * 개인정보보호법: 1년 미접속 시 휴면 전환·분리보관·파기 대상. 본 테이블로 활동을 추적한다.
 *  - customer_id: Medusa customer.id (고객당 1건)
 *  - last_active_at: 마지막 인증 활동(로그인·마이페이지 접근) 시각
 * (코어 customer 미수정 — 가드레일)
 */
import { model } from "@medusajs/framework/utils"

const CustomerActivity = model.define("customer_activity", {
  id: model.id({ prefix: "cact" }).primaryKey(),
  customer_id: model.text().unique(),
  last_active_at: model.dateTime(),
})

export default CustomerActivity
