/**
 * 포인트 자동적립 멱등 로그(PointAccrualLog) 모델 — 주문별 중복 적립 방지.
 *
 * 동일 order_id + reason 조합으로 이미 적립이 처리된 경우 재적립을 차단한다.
 * append-only — 삭제/수정하지 않으며, 중복 체크는 order_id + reason UNIQUE 인덱스로 보장.
 *
 * spec: dag/d5_회원관리/t005_포인트 §멱등성 (order-placed-rewards 자동적립 보강)
 */
import { model } from "@medusajs/framework/utils"

const PointAccrualLog = model.define("point_accrual_log", {
  // 레코드 고유 id (prefix = pal)
  id: model.id({ prefix: "pal" }).primaryKey(),
  // 주문 id — 중복 체크 대상(Medusa order.id)
  order_id: model.text(),
  // 고객 id (Medusa customer.id)
  customer_id: model.text(),
  // 적립 사유(purchase / signup 등) — order_id 와 복합 UNIQUE 구성
  reason: model.text(),
  // 실제 적립된 포인트(0 이면 skipped)
  points_earned: model.number().default(0),
  // 적립 당시 생성된 PointLedger id (skipped 시 null)
  ledger_id: model.text().nullable(),
})

export default PointAccrualLog
