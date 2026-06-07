/**
 * 제재 모듈 정의 (d5 t006_제재블랙리스트 갭B 신규 모듈).
 *
 * 역할: 고객 제재 단계 상승/해제 + 로그인 차단 판정.
 * 가드레일: Medusa core(customer) 미수정 — customer_id(text) 느슨 연결.
 */
import { Module } from "@medusajs/framework/utils"
import CustomerSanctionModuleService from "./service"

export const CUSTOMER_SANCTION_MODULE = "customerSanction"

export default Module(CUSTOMER_SANCTION_MODULE, {
  service: CustomerSanctionModuleService,
})
