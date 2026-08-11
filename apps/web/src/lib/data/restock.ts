"use server"

// 재입고 알림 데이터 계층 (실제 백엔드 연동)
// 백엔드 store 라우트 `POST /store/restock-notifications` (restock-notification 모듈).

import { getT } from "@lib/i18n"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export async function subscribeRestock(
  variantId: string,
  productId: string,
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const headers = { ...(await getAuthHeaders()) }
  try {
    await sdk.client.fetch(`/store/restock-notifications`, {
      method: "POST",
      headers,
      body: { variant_id: variantId, product_id: productId, email },
    })
    return { ok: true }
  } catch {
    return { ok: false, error: (await getT())("err.restock") }
  }
}
