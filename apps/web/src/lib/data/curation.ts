// 홈 큐레이션(MD 추천) 데이터 계층.
//   - GET /store/curated-products → product_id 목록
//   - 표준 store products API 로 상품 데이터 조회(가격 포함)
import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"
import { listProducts } from "./products"

export async function getCuratedProducts(
  region: HttpTypes.StoreRegion
): Promise<HttpTypes.StoreProduct[]> {
  const next = { ...(await getCacheOptions("curated-products")) }
  let ids: string[] = []
  try {
    const res = await sdk.client.fetch<{ product_ids: string[] }>(
      `/store/curated-products`,
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
    // 큐레이션 순서 유지
    const byId = new Map(products.map((p) => [p.id, p]))
    return ids.map((id) => byId.get(id)).filter(Boolean) as HttpTypes.StoreProduct[]
  } catch {
    return []
  }
}
