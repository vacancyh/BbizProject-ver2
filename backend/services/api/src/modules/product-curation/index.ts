/**
 * 상품 큐레이션 모듈 — 조회수·위시리스트·인기검색어·금칙어 관리.
 *
 * 구성 모델:
 *  - ProductViewCount    : 상품별 누적 조회수
 *  - ProductWishlist     : 고객별 상품 위시리스트
 *  - PopularSearchTerm   : 인기 검색어 집계 + 금칙어 플래그
 *  - BannedWord          : 금칙어 원부(scope 별 차단)
 *
 * 가드레일: Medusa core 미수정. 본 모듈 전용 테이블만 사용.
 */
import { Module } from "@medusajs/framework/utils"
import ProductCurationModuleService from "./service"

export const PRODUCT_CURATION_MODULE = "productCuration"

export default Module(PRODUCT_CURATION_MODULE, {
  service: ProductCurationModuleService,
})
