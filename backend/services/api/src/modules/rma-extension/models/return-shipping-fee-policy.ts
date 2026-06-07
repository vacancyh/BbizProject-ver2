import { model } from "@medusajs/framework/utils"

/**
 * ReturnShippingFeePolicy
 * ----------------------------------------------------------------------------
 * 반품 사유별 배송비 부담 주체 정책 (전자상거래법 §17 ②).
 *
 * - `returns_policy_id` : 상위 `ReturnsPolicy.id` 참조.
 * - `reason`            : 반품 사유 enum.
 *                         CUSTOMER_CHANGE_OF_MIND = 단순변심 → 소비자 부담
 *                         PRODUCT_DEFECT          = 상품불량 → 사업자 부담
 *                         WRONG_DELIVERY          = 오배송   → 사업자 부담
 *                         OTHER                   = 기타     → 정책 따라
 * - `payer`             : 배송비 부담 주체 enum.
 *                         CUSTOMER = 소비자 부담
 *                         SELLER   = 사업자 부담
 * - `amount`            : 고정 배송비 (nullable, null 이면 실 배송비 사용).
 */

/** 반품 사유 enum 상수 */
export const RETURN_REASONS = [
  "CUSTOMER_CHANGE_OF_MIND",
  "PRODUCT_DEFECT",
  "WRONG_DELIVERY",
  "OTHER",
] as const
export type ReturnReasonValue = (typeof RETURN_REASONS)[number]

/** 배송비 부담 주체 enum 상수 */
export const SHIPPING_FEE_PAYERS = ["CUSTOMER", "SELLER"] as const
export type ShippingFeePayerValue = (typeof SHIPPING_FEE_PAYERS)[number]

export const ReturnShippingFeePolicy = model.define("ReturnShippingFeePolicy", {
  id: model.id({ prefix: "rsfee" }).primaryKey(),
  returns_policy_id: model.text(),
  reason: model.enum([...RETURN_REASONS]),
  payer: model.enum([...SHIPPING_FEE_PAYERS]),
  amount: model.bigNumber().nullable(),
})

export default ReturnShippingFeePolicy
