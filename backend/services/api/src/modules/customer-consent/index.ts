/**
 * 동의 이력 모듈 정의 (d5 t008_동의이력 갭B 신규 모듈).
 *
 * 역할: 채널별 동의/철회 이력(append-only) + 2년 재확인 도래 판정.
 * 가드레일: Medusa core(customer) 미수정 — customer_id(text) 느슨 연결.
 */
import { Module } from "@medusajs/framework/utils"
import CustomerConsentModuleService from "./service"

export const CUSTOMER_CONSENT_MODULE = "customerConsent"

export default Module(CUSTOMER_CONSENT_MODULE, {
  service: CustomerConsentModuleService,
})
