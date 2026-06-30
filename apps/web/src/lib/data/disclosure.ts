// 상품정보고시 데이터 계층 (실제 백엔드 연동)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트 `GET /store/products/:id/disclosure` 로 현행(published) 고시를 조회한다.
// (백엔드: src/api/store/products/[id]/disclosure/route.ts · product-disclosure 모듈)
// 전자상거래법 「상품정보제공고시」 — 관리자가 게시한 항목을 그대로 노출.

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type ProductDisclosure = {
  product_id: string
  version: number
  /** 고시 항목 키-값 (예: { "소재": "면 100%", ... }) */
  fields: Record<string, string>
}

export async function getProductDisclosure(
  productId: string
): Promise<ProductDisclosure | null> {
  const next = { ...(await getCacheOptions(`disclosure-${productId}`)) }
  try {
    const res = await sdk.client.fetch<{ disclosure: ProductDisclosure | null }>(
      `/store/products/${productId}/disclosure`,
      { method: "GET", next, cache: "force-cache" }
    )
    return res?.disclosure ?? null
  } catch {
    return null
  }
}
