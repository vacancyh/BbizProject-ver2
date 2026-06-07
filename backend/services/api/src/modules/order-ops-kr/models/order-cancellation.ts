/**
 * 주문 취소/환불 기록(OrderCancellation) — append-only.
 *
 * 환불 실행 시 1건 적재. 수정·삭제 금지(append-only).
 * Medusa core 미수정 — order_id(text) 느슨 연결.
 *
 * spec: dag/d2_주문관리/t007_환불.md §7 DB, §1 F6·F7
 */
import { model } from "@medusajs/framework/utils"

const OrderCancellation = model.define("order_cancellation", {
  // 레코드 고유 id (prefix = ocnl)
  id: model.id({ prefix: "ocnl" }).primaryKey(),
  // Medusa order.id (text 보관, core 미수정)
  order_id: model.text().index("IDX_order_cancellation_order_id"),
  // 환불금액(원)
  refund_amount: model.number(),
  // 환불 수단: pg = 원결제 PG 취소, account = 고객 계좌 현금 입금
  refund_method: model.text(),
  // 계좌 입금 시 은행·계좌·예금주 JSON — PG 취소는 null
  account_info: model.json().nullable(),
  // 복원 포인트(원)
  restored_points: model.number().default(0),
  // 복원 쿠폰 할인액(원)
  restored_coupon: model.number().default(0),
  // 환불 사유 (cancel/return/claim/etc.)
  reason: model.text(),
})

export default OrderCancellation
