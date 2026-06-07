/**
 * 타임세일 모듈 — 상품별 한시 할인(GAP_B, Medusa 코어 없음).
 * 운영자: 세일 생성/목록/종료. 상태/가격 계산은 logic.ts 순수함수가 담당.
 * 가드레일: Medusa core 미수정. 본 모듈 전용 테이블(time_sale)만 사용.
 * deferred: 소진 자동종료(cron), 원가복원, 상품 큐레이션(조회수/위시/금칙어).
 */
import { Module } from "@medusajs/framework/utils"
import TimeSaleModuleService from "./service"

export const TIME_SALE_MODULE = "timeSale"

export default Module(TIME_SALE_MODULE, {
  service: TimeSaleModuleService,
})
