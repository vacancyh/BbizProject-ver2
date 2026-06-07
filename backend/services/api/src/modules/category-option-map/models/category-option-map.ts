/**
 * 카테고리 ↔ 옵션템플릿 N:M 매핑 모델
 *
 * 설계 근거:
 *  - 진열 카테고리(Medusa product_category)는 스토어프론트 진열 축
 *  - 상품유형 옵션템플릿(product_type_option_template)은 상품 등록 시 폼 자동주입 축
 *  - 두 축은 원래 별개이나, 카테고리별로 "어떤 옵션을 기본 제공할지" 힌트를 줄 수 있음
 *  - 1개 카테고리에 N개 옵션템플릿, 1개 옵션템플릿이 M개 카테고리 — N:M 매핑
 *
 * 테이블명: category_option_map
 *  - category_id   = Medusa product_category.id (외부 참조, 외래키 없음 — 모듈 경계 분리)
 *  - option_tmpl_id = product_type_option_template.id (외부 참조, 외래키 없음)
 *  - sort_order    = 카테고리 안 옵션 표시 순서
 */
import { model } from "@medusajs/framework/utils"

const CategoryOptionMap = model.define("category_option_map", {
  /** 레코드 고유 id (prefix = catopt) */
  id: model.id({ prefix: "catopt" }).primaryKey(),
  /** Medusa product_category.id */
  category_id: model.text(),
  /** product_type_option_template.id */
  option_tmpl_id: model.text(),
  /** 같은 카테고리 안 표시 순서 (작을수록 먼저) */
  sort_order: model.number().default(0),
})

export default CategoryOptionMap
