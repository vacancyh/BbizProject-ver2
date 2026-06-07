/**
 * ExchangeGroup 모델 — 다건 교환 그룹(order-exchange-group 모듈).
 *
 * 다건 교환을 1개 그룹으로 묶어 1회 회수 운송장 + 차액 합산 처리를 지원합니다.
 * spec: t005_교환.md §7 DB 영향 (exchange_group 커스텀 모듈, 설계 D11).
 *
 * 필드:
 *  - order_id            : Medusa order.id (core 미수정, text 보관)
 *  - total_price_diff    : 차액 합계 (양수=추가결제, 음수=환불, 단위=원)
 *  - pickup_tracking_no  : 1회 회수 운송장 번호 (선택)
 *  - version             : 낙관적 잠금용 버전 카운터
 *  - status              : 그룹 상태 (PENDING / PROCESSING / COMPLETED / CANCELED)
 *  - exchange_ids        : 묶인 exchange id 목록 (JSON 배열)
 */
import { model } from "@medusajs/framework/utils"

/** 교환 그룹 상태 enum */
export const EXCHANGE_GROUP_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "CANCELED",
] as const
export type ExchangeGroupStatusValue = (typeof EXCHANGE_GROUP_STATUSES)[number]

export const ExchangeGroup = model.define("exchange_group", {
  /** 그룹 고유 id (prefix = exgrp) */
  id: model.id({ prefix: "exgrp" }).primaryKey(),
  /** Medusa order.id (core 미수정, text 보관) */
  order_id: model.text().index("IDX_exchange_group_order_id"),
  /** 차액 합계 — 양수=추가결제, 음수=환불 (단위=원) */
  total_price_diff: model.number().default(0),
  /** 1회 회수 운송장 번호 (선택) */
  pickup_tracking_no: model.text().nullable(),
  /** 낙관적 잠금용 버전 카운터 */
  version: model.number().default(1),
  /** 그룹 상태 */
  status: model.text().default("PENDING"),
  /** 묶인 exchange id 목록 (JSON 배열 직렬화 — jsonb 컬럼) */
  exchange_ids: model.json(),
})

export default ExchangeGroup
