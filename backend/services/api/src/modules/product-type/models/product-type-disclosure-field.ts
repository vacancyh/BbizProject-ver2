/**
 * 상품유형 고시 필수항목 정의 모델 (전자상거래법 상품정보제공고시)
 *
 * 설계 근거: _보강설계_결정반영.md §B L-03 (고시 검증 immediate 승격)
 *
 * 상품유형(상품군)별 법정 필수 표시항목을 정의한다.
 *  - 의류 → 제품소재·치수·제조국·세탁방법·A/S …
 *  - 악세서리 → 소재·치수·제조국·품질보증기준·A/S …
 * 상품 등록 시 유형을 고르면 이 정의에 따라 고시 입력 폼이 자동 생성되고,
 * 게시(published) 전 required 항목 누락 시 차단한다.
 */
import { model } from "@medusajs/framework/utils"

const ProductTypeDisclosureField = model.define("product_type_disclosure_field", {
  // 레코드 고유 id (prefix = ptdf)
  id: model.id({ prefix: "ptdf" }).primaryKey(),
  // 소속 상품유형 id (product_type_template.id)
  type_template_id: model.text(),
  // 항목 키 (저장 시 사용, 예: "material")
  field_key: model.text(),
  // 화면 표시 라벨 (예: "제품 소재")
  label: model.text(),
  // 법정 필수 여부 (true = 게시 전 필수)
  required: model.boolean().default(true),
  // 입력 형태 (text | textarea)
  input_type: model.text().default("text"),
  // 표시 순서
  sort_order: model.number().default(0),
})

export default ProductTypeDisclosureField
