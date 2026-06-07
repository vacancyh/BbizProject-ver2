/**
 * 카테고리 ↔ 옵션템플릿 N:M 매핑 모듈 정의
 *
 * product-type 모듈 / Medusa 코어 카테고리 모두 수정하지 않고
 * 별도 격리 모듈로 매핑만 관리한다(모듈 경계 분리 원칙).
 */
import { Module } from "@medusajs/framework/utils"
import CategoryOptionMapModuleService from "./service"

export const CATEGORY_OPTION_MAP_MODULE = "categoryOptionMap"

export default Module(CATEGORY_OPTION_MAP_MODULE, {
  service: CategoryOptionMapModuleService,
})
