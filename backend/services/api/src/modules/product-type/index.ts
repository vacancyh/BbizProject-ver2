/**
 * 상품유형 모듈 정의 (한국형 커머스 확장)
 *
 * 메두사 코어 상품 엔티티를 수정하지 않고, 상품유형(옵션 템플릿 + 2단계 고시 정의)을
 * 별도 데이터 모델로 격리한다. (legal-kr 모듈과 동일 격리 원칙)
 */
import { Module } from "@medusajs/framework/utils"
import ProductTypeModuleService from "./service"

export const PRODUCT_TYPE_MODULE = "productType"

export default Module(PRODUCT_TYPE_MODULE, {
  service: ProductTypeModuleService,
})
