/**
 * 감사 로그 모듈 — 경계 스텁 (Phase 0)
 *
 * 역할: 모든 write 액션 append-only 기록 + 5년 보관 + PII 마스킹.
 * 출처: 관리자_설계.md §5.3 / 쇼핑몰_전용_QA_v4.md ADM-R-010.
 *
 * ⚠️ Phase 0 = 폴더 경계만. 모델(audit_log)·write 미들웨어·보존 정책은 ② 도메인 루프(기반)에서 구현.
 *    append-only 보장(UPDATE/DELETE 금지) + actor/action/target/diff/ip/ts 컬럼 설계.
 *
 * 가드레일: Medusa core 수정 금지. 미들웨어에서 PII(전화/주소/주민)는 마스킹 후 저장.
 */
import { Module } from "@medusajs/framework/utils"
import AuditModuleService from "./service"

export const AUDIT_MODULE = "audit"

export default Module(AUDIT_MODULE, {
  service: AuditModuleService,
})
