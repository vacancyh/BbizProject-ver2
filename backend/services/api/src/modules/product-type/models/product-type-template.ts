/**
 * 상품유형(Product Type) 모델 — 한국형 커머스 확장
 *
 * 설계 근거: main_plan/도메인설계/상품_카테고리_설계.md (분류 3축 중 ② 상품유형)
 *
 * 상품유형 = "무엇을 파는가"를 나타내는 스키마 템플릿.
 *  - 옵션 템플릿(사이즈/색상/손가락 호수)을 결정한다. (1단계)
 *  - (2단계) 상품정보제공고시 필수항목을 결정한다.
 *
 * 한국 전자상거래법 「상품정보제공 고시」의 품목(약 40종)을 기반으로 운영한다.
 * 진열 카테고리(Medusa product_category)와는 별개 축이다.
 *
 * ※ 테이블명 product_type_template — Medusa 코어 native product_type 테이블과 충돌 회피.
 */
import { model } from "@medusajs/framework/utils"

const ProductTypeTemplate = model.define("product_type_template", {
  // 레코드 고유 id (prefix = pttpl)
  id: model.id({ prefix: "pttpl" }).primaryKey(),
  // 상위 노드 id — null 이면 "판매 분야(상품군)"(의류/가전/식품), 값이 있으면 "분류"(상의/벨트/모자)
  parent_id: model.text().nullable(),
  // 이름 (분야: "의류" / 분류: "상의")
  name: model.text(),
  // 전자상거래법 상품정보제공고시 품목 코드 (예: "clothing") — 분류 단위
  disclosure_code: model.text().nullable(),
  // 표시 순서 (작을수록 먼저)
  rank: model.number().default(0),
})

export default ProductTypeTemplate
