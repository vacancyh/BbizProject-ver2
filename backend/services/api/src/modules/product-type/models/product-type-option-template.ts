/**
 * 상품유형 옵션 템플릿 모델
 *
 * 상품유형이 가지는 기본 옵션 정의. 상품 등록 시 유형을 고르면 이 옵션들이 폼에 자동 주입된다.
 *  - 의류    → 사이즈[S·M·L·XL·Free], 색상[...]
 *  - 악세서리 → 손가락 호수[5호·6호·...]
 *
 * 한 유형이 여러 옵션을 가지므로 (유형 + 옵션명) 단위로 1행씩 저장한다.
 */
import { model } from "@medusajs/framework/utils"

const ProductTypeOptionTemplate = model.define("product_type_option_template", {
  // 레코드 고유 id (prefix = ptopt)
  id: model.id({ prefix: "ptopt" }).primaryKey(),
  // 소속 상품유형 id (product_type_template.id)
  type_template_id: model.text(),
  // 옵션 이름 (예: "사이즈", "색상", "손가락 호수")
  option_title: model.text(),
  // 옵션 값 목록 (string[]) — 예: ["S","M","L","XL"]
  option_values: model.json(),
  // 같은 유형 안 옵션 표시 순서
  rank: model.number().default(0),
})

export default ProductTypeOptionTemplate
