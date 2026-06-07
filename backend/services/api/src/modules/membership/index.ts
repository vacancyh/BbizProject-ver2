/**
 * 멤버십 모듈 정의 (d5 t004_멤버십등급 갭B 신규 모듈).
 *
 * 역할: 고객별 누적 적립금액·등급 영속 + 룰 기반 등급 재산정.
 * 가드레일: Medusa core(customer) 미수정 — customer_id(text) 느슨 연결.
 *           등급 정책(tiers)은 policy 모듈 `membership.tiers` 재사용(별도 정책 테이블 미신설).
 */
import { Module } from "@medusajs/framework/utils"
import MembershipModuleService from "./service"

export const MEMBERSHIP_MODULE = "membership"

export default Module(MEMBERSHIP_MODULE, {
  service: MembershipModuleService,
})
