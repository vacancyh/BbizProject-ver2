import { model } from "@medusajs/framework/utils"

/**
 * ReturnsPolicy
 * ----------------------------------------------------------------------------
 * 스토어 단위 반품 정책 데이터 모델입니다.
 *
 * - `store_id`        : 메두사 `store.id` 와 link 됩니다 (다국가 시 분리 가능).
 * - `window_days`     : 반품 가능 기간 (한국 = 7 일, 전자상거래법 §17 ①).
 * - `restocking_fee_pct` : 재입고 수수료 비율 (0 ~ 100, 한국 기본 = 0).
 * - `shipping_fee_payer` : 기본 배송비 부담 주체 enum.
 * - `active`          : 정책 활성화 여부 (false 면 신규 반품 차단).
 */
export const ReturnsPolicy = model.define("ReturnsPolicy", {
  id: model.id({ prefix: "rpol" }).primaryKey(),
  store_id: model.text(),
  name: model.text(),
  window_days: model.number().default(7),
  restocking_fee_pct: model.number().default(0),
  shipping_fee_payer: model
    .enum(["customer", "seller", "split"])
    .default("customer"),
  active: model.boolean().default(true),
})

export default ReturnsPolicy
