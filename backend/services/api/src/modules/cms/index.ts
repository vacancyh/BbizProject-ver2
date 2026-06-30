/**
 * CMS(고객센터 콘텐츠) 모듈 정의 — 공지/FAQ.
 *
 * 고객센터 공지사항·자주 묻는 질문을 관리자에서 관리하고 스토어프론트가 노출한다.
 * Medusa core 미수정 — 커스텀 모듈(전용 테이블 notice/faq).
 */
import { Module } from "@medusajs/framework/utils"
import CmsModuleService from "./service"

export const CMS_MODULE = "cms"

export default Module(CMS_MODULE, {
  service: CmsModuleService,
})
