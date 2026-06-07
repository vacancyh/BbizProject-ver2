import { model } from "@medusajs/framework/utils"

/**
 * ReturnInspection
 * ----------------------------------------------------------------------------
 * 반품 수령 후 검수 결과를 기록하는 데이터 모델입니다.
 *
 * - `order_return_id` : 메두사 `order_return.id` 와 link 됩니다.
 * - `resellable`      : 재판매 가능 여부 (true 면 재고 복원, false 면 폐기).
 * - `condition`       : 상품 상태 등급 enum.
 *                       A_GRADE  = 새 상품 수준 (재판매 가능)
 *                       B_GRADE  = 경미한 손상 (할인 재판매)
 *                       C_GRADE  = 손상 (outlet 처분)
 *                       DISPOSE  = 폐기
 * - `inspector_id`    : 검수 담당 admin user id.
 * - `notes`           : 검수 메모.
 * - `inspected_at`    : 검수 일시.
 */

/** 검수 상태 등급 enum 상수 */
export const RETURN_CONDITIONS = [
  "A_GRADE",
  "B_GRADE",
  "C_GRADE",
  "DISPOSE",
] as const
export type ReturnConditionValue = (typeof RETURN_CONDITIONS)[number]

export const ReturnInspection = model.define("ReturnInspection", {
  id: model.id({ prefix: "rinsp" }).primaryKey(),
  order_return_id: model.text(),
  resellable: model.boolean().default(true),
  condition: model.enum([...RETURN_CONDITIONS]).default("A_GRADE"),
  inspector_id: model.text().nullable(),
  notes: model.text().nullable(),
  inspected_at: model.dateTime(),
})

export default ReturnInspection
