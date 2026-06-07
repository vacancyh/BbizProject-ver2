/**
 * 정산 지급 모듈 정의 (d7 정산관리 갭B 신규 모듈).
 *
 * 역할: 정산 기간별 스냅샷(매출/환불/PG수수료/순정산) + 마감/지급 상태머신.
 * 가드레일: Medusa core 미수정. 집계 룰은 admin lib settlement-logic 단일 진실 재사용.
 *           실지급(PG 송금) 외부 연동은 deferred.
 */
import { Module } from "@medusajs/framework/utils"
import SettlementPayoutModuleService from "./service"

export const SETTLEMENT_PAYOUT_MODULE = "settlementPayout"

export default Module(SETTLEMENT_PAYOUT_MODULE, {
  service: SettlementPayoutModuleService,
})
