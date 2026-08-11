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
  /**
   * 고시 항목 키-값. **키는 field_key**(`material` 등)일 수도, 구 데이터의 한글 항목명일
   * 수도 있다. 화면에 찍을 때는 아래 `items` 를 쓴다.
   */
  fields: Record<string, string>
  /**
   * 항목명이 붙고 템플릿 순서로 정렬된 목록(2026-08-10 추가).
   *
   * `fields` 의 키를 그대로 항목명으로 쓰면 관리자에서 입력한 고시가 화면에
   * `material` `origin` 처럼 영문 슬러그로 나온다. 백엔드가 상품유형 템플릿에서
   * 항목명을 찾아 붙여 준다.
   *
   * 구버전 백엔드는 이 필드를 안 줄 수 있으므로 optional 이다.
   */
  items?: { key: string; label: string; value: string }[]
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
