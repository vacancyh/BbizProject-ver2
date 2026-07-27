/**
 * 휴면계정 모듈 — 고객 활동시각 추적 + 휴면/임박 판정(개인정보보호법 유효기간).
 * 전환·분리보관·파기·재활성/사전안내 발송은 이 판정 위에 배치잡·알림으로 후속 확장.
 */
import { Module } from "@medusajs/framework/utils"
import CustomerDormancyModuleService from "./service"

export const CUSTOMER_DORMANCY_MODULE = "customerDormancy"

export default Module(CUSTOMER_DORMANCY_MODULE, {
  service: CustomerDormancyModuleService,
})
