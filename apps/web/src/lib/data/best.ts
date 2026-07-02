// 베스트(인기) 상품 데이터 계층.
//   - GET /store/best-products?limit= → product_id 목록(조회수+위시 랭킹)
//   - 표준 store products API 로 상품 데이터 조회(가격 포함)
import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
import { listProducts } from "./products"

export async function getBestProducts(
  region: HttpTypes.StoreRegion,
  limit = 8
): Promise<HttpTypes.StoreProduct[]> {
  const next = { ...(await getCacheOptions("best-products")) }
  let ids: string[] = []
  try {
    const res = await sdk.client.fetch<{ product_ids: string[] }>(
      `/store/best-products?limit=${limit}`,
      { method: "GET", next, cache: "force-cache" }
    )
    ids = res?.product_ids ?? []
  } catch {
    return []
  }
  if (!ids.length) return []

  try {
    const {
      response: { products },
    } = await listProducts({
      regionId: region.id,
      queryParams: {
        id: ids,
        fields: "*variants.calculated_price",
      } as any,
    })
    // 랭킹 순서 유지
    const byId = new Map(products.map((p) => [p.id, p]))
    return ids.map((id) => byId.get(id)).filter(Boolean) as HttpTypes.StoreProduct[]
  } catch {
    return []
  }
}
