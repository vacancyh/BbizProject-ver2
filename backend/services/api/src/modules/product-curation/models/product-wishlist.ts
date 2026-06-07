/**
 * 상품 위시리스트(Wishlist) 모델
 *
 * 고객별 + 상품별 위시리스트 항목을 관리한다.
 *  - customer_id: Medusa customer.id
 *  - product_id: Medusa product.id
 *  - (customer_id, product_id) 조합이 유니크(중복 찜 방지)
 */
import { model } from "@medusajs/framework/utils"

const ProductWishlist = model.define("product_wishlist", {
  // 레코드 고유 id (prefix = pwl)
  id: model.id({ prefix: "pwl" }).primaryKey(),
  // 고객 id (Medusa customer.id)
  customer_id: model.text().index("IDX_product_wishlist_customer_id"),
  // 대상 상품 id (Medusa product.id)
  product_id: model.text().index("IDX_product_wishlist_product_id"),
})

export default ProductWishlist
