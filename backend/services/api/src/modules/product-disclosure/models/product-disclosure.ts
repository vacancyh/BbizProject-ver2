/**
 * 상품정보고시(ProductDisclosure) 모델 — 버전 이력 관리
 *
 * 전자상거래법 「상품정보제공고시」의 상품별 실제 고시 내용을 버전 단위로 관리한다.
 *
 *  - product_id: 대상 상품(Medusa product.id)
 *  - type_template_id: 상품유형 템플릿 id (어떤 고시 폼 기준인지)
 *  - version: 버전 번호(1부터 자동 증가, 정수)
 *  - fields_json: 고시 항목 키-값 JSON (예: {"material":"면100%","country":"한국",...})
 *  - status: "draft" | "published" | "archived"
 *    - published 가 1건만 존재해야 함(서비스 레이어에서 보장)
 *    - 변경 시 기존 published → archived 자동 전이
 *  - published_by: 게시 처리자 admin user_id
 *  - published_at: 게시 일시
 *
 * 버전 이력:
 *  - 신규 고시 또는 수정 시 항상 새 레코드 생성(기존 수정 금지).
 *  - 이전 버전은 archived 상태로 보존(감사 추적 + 분쟁 대응).
 *  - 조회 시 published 중 최신 version 이 현행 고시.
 */
import { model } from "@medusajs/framework/utils"

const ProductDisclosure = model.define("product_disclosure", {
  // 레코드 고유 id (prefix = pdsc)
  id: model.id({ prefix: "pdsc" }).primaryKey(),
  // 대상 상품 id (Medusa product.id)
  product_id: model.text().index("IDX_product_disclosure_product_id"),
  // 상품유형 템플릿 id (고시 폼 기준)
  type_template_id: model.text().index("IDX_product_disclosure_type_template_id"),
  // 버전 번호(1부터, 상품 당 순차 증가)
  version: model.number().default(1),
  // 고시 항목 키-값 JSON 문자열
  fields_json: model.text(),
  // 상태: draft | published | archived
  status: model.text().default("draft"),
  // 게시 처리자 admin user_id (미게시 = null)
  published_by: model.text().nullable(),
  // 게시 일시 (null = 미게시)
  published_at: model.dateTime().nullable(),
})

export default ProductDisclosure
