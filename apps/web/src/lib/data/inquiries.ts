"use server"

// 상품 문의(Q&A) 데이터 계층 (실제 백엔드 연동)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트 `GET/POST /store/products/:id/inquiries` (review 모듈 type=inquiry).
// 목록: 답변완료/공개 문의(질문+운영자 답변). 작성: 상태 pending → 운영자 답변 대기.

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheOptions } from "./cookies"

export type ProductInquiry = {
  id: string
  author: string
  content: string
  created_at: string
  reply: string | null
  replied_at: string | null
  answered: boolean
}

export async function listProductInquiries(
  productId: string
): Promise<ProductInquiry[]> {
  const next = { ...(await getCacheOptions(`inquiries-${productId}`)) }
  try {
    const res = await sdk.client.fetch<{ inquiries: ProductInquiry[] }>(
      `/store/products/${productId}/inquiries`,
      { method: "GET", next, cache: "force-cache" }
    )
    return res?.inquiries ?? []
  } catch {
    return []
  }
}

export async function createProductInquiry(
  productId: string,
  input: { author_name?: string; content: string }
): Promise<{ pending: boolean }> {
  const headers = { ...(await getAuthHeaders()) }
  await sdk.client.fetch(`/store/products/${productId}/inquiries`, {
    method: "POST",
    headers,
    body: input,
  })
  return { pending: true }
}
