/**
 * 상품정보고시(ProductDisclosure) 모듈 — 버전 이력 관리.
 *
 * 전자상거래법 「상품정보제공고시」의 상품별 실제 고시 내용을 버전 단위로 관리한다.
 *  - draft → published → archived 상태머신
 *  - 상품 당 published 1건 보장(신규 게시 시 기존 published → archived 자동 전이)
 *  - 버전 이력 영구 보존(삭제 금지)
 *
 * 가드레일: Medusa core 미수정. 본 모듈 전용 테이블만 사용.
 */
import { Module } from "@medusajs/framework/utils"
import ProductDisclosureModuleService from "./service"

export const PRODUCT_DISCLOSURE_MODULE = "productDisclosure"

export default Module(PRODUCT_DISCLOSURE_MODULE, {
  service: ProductDisclosureModuleService,
})
