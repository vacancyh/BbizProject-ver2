import { model } from "@medusajs/framework/utils"

/**
 * ReimbursementMethod
 * ----------------------------------------------------------------------------
 * 메두사 `order_return` 1 건과 1:1 로 연결되는 환불 방식 레코드입니다.
 *
 * - `order_return_id` : 메두사 `order_return.id` 와 link 됩니다.
 * - `type`            : 4 종 환불 타입 enum.
 *                       REFUND          = 원결제수단 환불
 *                       STORE_CREDIT    = 적립금 환불
 *                       EXCHANGE        = 교환 발송
 *                       REPLACEMENT     = 동일 품목 재발송 (claim type=replace)
 * - `amount`          : 환불 금액 (배송비 가감 반영된 최종 금액).
 * - `status`          : 환불 상태 enum.
 *                       PENDING / PROCESSING / COMPLETED / FAILED / CANCELED
 */

/** 환불 타입 enum 상수 (서비스/시드/검증 공용) */
export const REIMBURSEMENT_TYPES = [
  "REFUND",
  "STORE_CREDIT",
  "EXCHANGE",
  "REPLACEMENT",
] as const
export type ReimbursementTypeValue = (typeof REIMBURSEMENT_TYPES)[number]

/** 환불 상태 enum 상수 */
export const REIMBURSEMENT_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELED",
] as const
export type ReimbursementStatusValue = (typeof REIMBURSEMENT_STATUSES)[number]

export const ReimbursementMethod = model.define("ReimbursementMethod", {
  id: model.id({ prefix: "rmeth" }).primaryKey(),
  order_return_id: model.text(),
  type: model.enum([...REIMBURSEMENT_TYPES]),
  amount: model.bigNumber().default(0),
  status: model.enum([...REIMBURSEMENT_STATUSES]).default("PENDING"),
})

export default ReimbursementMethod
