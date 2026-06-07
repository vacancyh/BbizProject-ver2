/**
 * 약관 관리 모듈 정의 — t008 약관 관리.
 *
 * 버전별 약관/방침 관리 + 게시 + 동의 재요청 트리거(d5 t008 연동).
 * Medusa core 없음 — 커스텀 모듈.
 *
 * 출처: t008_약관관리.md §7 (DB: legal_doc 테이블)
 */
import { Module } from "@medusajs/framework/utils"
import LegalDocModuleService from "./service"

export const LEGAL_DOC_MODULE = "legalDoc"

export default Module(LEGAL_DOC_MODULE, {
  service: LegalDocModuleService,
})
