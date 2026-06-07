/**
 * 포인트 모듈 정의 (d5 t005_포인트 갭B 신규 모듈).
 *
 * 역할: 포인트 적립/사용/소멸 원장(append-only) + 잔액 계산.
 * 가드레일: Medusa core(customer) 미수정 — customer_id(text) 느슨 연결.
 *           적립률/유효기간 정책은 정책(membership.tiers earnRate / point.expire_months) 주입.
 */
import { Module } from "@medusajs/framework/utils"
import CustomerPointModuleService from "./service"

export const CUSTOMER_POINT_MODULE = "customerPoint"

export default Module(CUSTOMER_POINT_MODULE, {
  service: CustomerPointModuleService,
})
