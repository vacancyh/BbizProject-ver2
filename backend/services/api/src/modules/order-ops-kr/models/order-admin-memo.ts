/**
 * 주문 관리자 메모(OrderAdminNote) 모델 — 고객 비노출 내부 메모.
 *
 * 출처: 관리자_설계.md 주문 운영 / prototype 주문 상세 "관리자 메모(고객 비노출)".
 * Medusa core 에 동등 기능 없음(GAP_B) → custom. order 와는 order_id(text) 로 느슨 연결(core 미수정).
 *
 * ⚠️ 모델 키는 OrderAdminNote(=table order_admin_note). "Memo"는 MedusaService 런타임 pluralize
 *    ("Memos")와 TS 타입생성("Memoes")이 불일치하여 'o'로 끝나지 않는 Note 로 명명함.
 */
import { model } from "@medusajs/framework/utils"

const OrderAdminNote = model.define("order_admin_note", {
  // 메모 고유 id (prefix = omemo)
  id: model.id({ prefix: "omemo" }).primaryKey(),
  // Medusa order.id (core 미수정, text 보관)
  order_id: model.text().index("IDX_order_admin_note_order_id"),
  // 메모 본문(고객 비노출)
  content: model.text(),
  // 메모 종류(memo=일반 / cancel=강제취소 사유 / system=시스템)
  kind: model.text().default("memo"),
  // 작성자 user.id
  author_id: model.text().nullable(),
  // 작성자 이메일
  author_email: model.text().nullable(),
})

export default OrderAdminNote
