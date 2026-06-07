/**
 * 정산 지급(SettlementPayout) 모델 — 정산 기간별 스냅샷 + 지급 상태.
 *
 * 기간(period_key, 예: "2026-06")당 1행. 집계 스냅샷(gross/refund/pg_fee/net) + 상태머신.
 * Medusa core 미수정 — 집계는 주문 데이터 기반(admin 집계 결과 스냅샷 저장).
 *
 * spec: dag/d7_정산관리/t00x_정산지급 (갭B 신규 모듈)
 */
import { model } from "@medusajs/framework/utils"

const SettlementPayout = model.define("settlement_payout", {
  // 레코드 고유 id (prefix = sttl)
  id: model.id({ prefix: "sttl" }).primaryKey(),
  // 정산 기간 키(예: 2026-06) — 유일
  period_key: model.text().unique(),
  // 매출(캡처액, 원)
  gross_amount: model.number().default(0),
  // 환불액(원)
  refund_amount: model.number().default(0),
  // PG 수수료(원)
  pg_fee: model.number().default(0),
  // 순정산액(원) = gross - refund - pg_fee
  net_amount: model.number().default(0),
  // 상태: open / closed / paid
  status: model.text().default("open"),
  // 마감 시각(ISO)
  closed_at: model.text().nullable(),
  // 지급 완료 시각(ISO)
  paid_at: model.text().nullable(),
  // 메모
  memo: model.text().nullable(),
})

export default SettlementPayout
