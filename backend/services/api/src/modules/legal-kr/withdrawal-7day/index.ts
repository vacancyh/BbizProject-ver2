/**
 * 한국 청약철회 7일 모듈 정의
 *
 * 출처:
 *  - 「전자상거래 등에서의 소비자보호에 관한 법률」 §17 (청약철회 7 일)
 *  - 동법 §18 (영업일 3 일 환불 의무)
 *
 * 본 모듈은 메두사 core entity 를 수정하지 않고 별도 데이터 모델로 한국법 메타데이터를 격리합니다.
 * 메두사 order 와의 관계는 src/links/order-withdrawal.ts 의 defineLink 로 정의합니다.
 */
import { Module } from "@medusajs/framework/utils"
import WithdrawalSevenDayModuleService from "./service"

// 모듈 등록 이름 (medusa-config.ts 의 resolve 와 매칭, container 해석 키로 사용)
export const WITHDRAWAL_7DAY_MODULE = "withdrawal7Day"

export default Module(WITHDRAWAL_7DAY_MODULE, {
  service: WithdrawalSevenDayModuleService,
})
