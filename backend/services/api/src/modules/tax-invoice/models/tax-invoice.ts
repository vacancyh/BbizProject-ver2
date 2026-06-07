/**
 * 세금계산서(TaxInvoice) 모델 — 고객별 세금계산서 발급/정정/취소 상태.
 *
 * Medusa core(customer/order) 미수정 — customer_id/order_id/payout_id(text) 느슨 연결.
 * payout_id: settlement_payout.id 를 text 로 보관 — 정산 기간과 세금계산서 링크(d7 정산관리).
 *
 * spec: dag/d5_회원관리/t007_세금계산서 §7 DB (갭B 신규 모듈)
 * spec: dag/d7_정산관리 — 세금계산서↔정산 연결(d7 링크)
 */
import { model } from "@medusajs/framework/utils"

const TaxInvoice = model.define("tax_invoice", {
  // 레코드 고유 id (prefix = txiv)
  id: model.id({ prefix: "txiv" }).primaryKey(),
  // Medusa customer.id (text 보관)
  customer_id: model.text().index("IDX_tax_invoice_customer_id"),
  // 연결 주문(선택)
  order_id: model.text().nullable(),
  // 연결 정산 지급 기간 id (settlement_payout.id 느슨 연결, d7 링크)
  // 참고: index("IDX_tax_invoice_payout_id") 는 nullable() 체이닝 불가 — db_manual SQL 로 직접 생성
  payout_id: model.text().nullable(),
  // 사업자등록번호(정규화 10자리)
  biz_no: model.text(),
  // 상호명
  company_name: model.text().nullable(),
  // 공급가액(원)
  amount: model.number().default(0),
  // 상태: pending / issued / amended / cancelled
  status: model.text().default("pending"),
})

export default TaxInvoice
