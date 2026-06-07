/**
 * 타임세일(TimeSale) 모델 — 상품별 한시 할인(GAP_B, Medusa 코어 없음).
 *  - product_id: 대상 상품(Medusa product.id), 인덱스.
 *  - discount_type: "percent" | "fixed", discount_value: 할인율/할인금액(주입 수치).
 *  - original_price: 원가 스냅샷(nullable). 상태 판정은 starts_at/ends_at + now 로 계산.
 *  - status: scheduled | active | ended (기본 scheduled).
 * numeric 필드(discount_value/original_price)는 service.toView 에서 Number() 정규화.
 */
import { model } from "@medusajs/framework/utils"

const TimeSale = model.define("time_sale", {
  id: model.id({ prefix: "tsale" }).primaryKey(),
  // 대상 상품(Medusa product.id)
  product_id: model.text().index("IDX_time_sale_product_id"),
  title: model.text(),
  // "percent" | "fixed"
  discount_type: model.text(),
  // 할인율(%) 또는 할인금액(원) — 정책 주입 수치
  discount_value: model.number(),
  // 원가 스냅샷(없으면 계산 시 호출자 원가 사용)
  original_price: model.number().nullable(),
  // ISO 문자열(시작/종료)
  starts_at: model.text(),
  ends_at: model.text(),
  // scheduled | active | ended
  status: model.text().default("scheduled").index("IDX_time_sale_status"),
})

export default TimeSale
