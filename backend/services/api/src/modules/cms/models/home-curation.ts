/**
 * 홈 큐레이션(HomeCuration) 모델 — 운영자가 메인에 노출할 추천 상품(MD 추천)을 지정.
 *
 * 기존 product-curation 어드민은 read-only 미리보기였음 → 본 모델로 "저장"을 지원한다.
 * product_id 만 저장하고, 상품 데이터는 스토어프론트가 store API 로 조회한다.
 */
import { model } from "@medusajs/framework/utils"

const HomeCuration = model.define("home_curation", {
  // 고유 id (prefix = crt)
  id: model.id({ prefix: "crt" }).primaryKey(),
  // 추천 상품 id (Medusa product.id)
  product_id: model.text(),
  // 정렬 순서 (오름차순)
  sort_order: model.number().default(0),
  // 게시 상태 (draft/published)
  status: model.text().default("published"),
})

export default HomeCuration
