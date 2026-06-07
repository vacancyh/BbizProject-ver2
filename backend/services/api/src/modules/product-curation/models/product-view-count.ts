/**
 * 상품 조회수(ViewCount) 모델
 *
 * 상품별 누적 조회수를 관리한다.
 *  - product_id: Medusa product.id (유니크, 상품 당 1레코드)
 *  - count: 누적 조회수 (0 이상)
 *  - last_viewed_at: 마지막 조회 시각
 */
import { model } from "@medusajs/framework/utils"

const ProductViewCount = model.define("product_view_count", {
  // 레코드 고유 id (prefix = pvc)
  id: model.id({ prefix: "pvc" }).primaryKey(),
  // 대상 상품 id (Medusa product.id) — 상품 당 1건
  product_id: model.text().index("IDX_product_view_count_product_id"),
  // 누적 조회수
  count: model.number().default(0),
  // 마지막 조회 일시 (최초 기록 시 null 허용)
  last_viewed_at: model.dateTime().nullable(),
})

export default ProductViewCount
