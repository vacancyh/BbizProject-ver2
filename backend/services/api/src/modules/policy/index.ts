/**
 * 정책 저장소 모듈 — 경계 스텁 (Phase 0)
 *
 * 역할: system_policies 통합 저장 + 변경 시 이중확인 + 변경이력(SUPER 전용) + 약관 관리.
 * 출처: 관리자_설계.md §5.5 / 쇼핑몰_전용_QA_v4.md ADM-S.
 *
 * ⚠️ Phase 0 = 폴더 경계만. 모델(system_policy, policy_history)·이중확인 플로우는 ② 도메인 루프(기반)에서 구현.
 *
 * 가드레일: Medusa core 수정 금지. 정책 변경은 audit 모듈에 자동 기록.
 */
import { Module } from "@medusajs/framework/utils"
import PolicyModuleService from "./service"

export const POLICY_MODULE = "policy"

export default Module(POLICY_MODULE, {
  service: PolicyModuleService,
})
