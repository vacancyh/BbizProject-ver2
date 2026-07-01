/**
 * 회원 위시리스트 항목 삭제
 *  - DELETE /store/customers/me/wishlist/:productId → 위시에서 제거
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CURATION_MODULE } from "../../../../../../modules/product-curation"
import type ProductCurationModuleService from "../../../../../../modules/product-curation/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const cid = (req as any).auth_context?.actor_id as string | undefined
  if (!cid) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }
  const svc = req.scope.resolve(
    PRODUCT_CURATION_MODULE
  ) as unknown as ProductCurationModuleService
  const productId = req.params.productId
  const existing = await svc.listProductWishlists({
    customer_id: cid,
    product_id: productId,
  })
  if (existing.length) {
    await svc.deleteProductWishlists(existing.map((r: any) => r.id))
  }
  const product_ids = await svc.getWishlistByCustomer(cid)
  res.json({ product_ids, removed: existing.length > 0 })
}
