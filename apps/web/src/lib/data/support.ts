"use server"

// 1:1 문의(상품무관) 데이터 계층 — 백엔드 store 라우트 POST /store/support-inquiries.
// review 모듈 type=inquiry(product_id=null) 로 접수 → 어드민 "리뷰·문의" 에서 답변.

import { getT } from "@lib/i18n"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export async function submitSupportInquiry(input: {
  author_name?: string
  author_email: string
  category: string
  subject?: string
  content: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const headers = { ...(await getAuthHeaders()) }
    await sdk.client.fetch(`/store/support-inquiries`, {
      method: "POST",
      headers,
      body: input,
    })
    return { ok: true }
  } catch (e) {
    const msg =
      e instanceof Error
        ? e.message
        : (await getT())("err.support")
    return { ok: false, error: msg }
  }
}
