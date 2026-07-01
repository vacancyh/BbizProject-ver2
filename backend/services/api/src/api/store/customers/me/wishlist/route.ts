/**
 * 회원 위시리스트 Store API — 로그인 고객 본인 위시리스트(서버 영속).
 *  - GET  /store/customers/me/wishlist            → 위시 product_id 목록
 *  - POST /store/customers/me/wishlist            → 추가(멱등). { product_id } 또는 { product_ids: [] }(쿠키→서버 머지)
 * 인증: /store/customers/me/* 는 Medusa 고객 인증(미인증 401). actor_id = customer.id.
 * 저장: product-curation 모듈 product_wishlist (customer_id+product_id 유니크).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_CURATION_MODULE } from "../../../../../modules/product-curation"
import type ProductCurationModuleService from "../../../../../modules/product-curation/service"

function customerId(req: MedusaRequest): string | null {
  return (req as any).auth_context?.actor_id ?? null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cid = customerId(req)
  if (!cid) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }
  const svc = req.scope.resolve(
    PRODUCT_CURATION_MODULE
  ) as unknown as ProductCurationModuleService
  const product_ids = await svc.getWishlistByCustomer(cid)
  res.json({ product_ids })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cid = customerId(req)
  if (!cid) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }
  const svc = req.scope.resolve(
    PRODUCT_CURATION_MODULE
  ) as unknown as ProductCurationModuleService
  const b = (req.body ?? {}) as { product_id?: string; product_ids?: string[] }
  const ids = (
    b.product_ids && Array.isArray(b.product_ids)
      ? b.product_ids
      : b.product_id
        ? [b.product_id]
        : []
  )
    .filter((x) => typeof x === "string" && x)
    .slice(0, 200) // 과대 요청 방지

  if (!ids.length) {
    res.status(400).json({ message: "product_id 가 필요합니다." })
    return
  }
  // 멱등 추가: 이미 있는 것은 건너뜀
  const existing = new Set(await svc.getWishlistByCustomer(cid))
  const toAdd = ids.filter((id) => !existing.has(id))
  if (toAdd.length) {
    await svc.createProductWishlists(
      toAdd.map((product_id) => ({ customer_id: cid, product_id }))
    )
  }
  const product_ids = await svc.getWishlistByCustomer(cid)
  res.status(201).json({ product_ids, added: toAdd.length })
}
