"use server"

// 적립금 사용(체크아웃) 데이터 계층 (실제 백엔드 연동)
// 백엔드 store 라우트 `POST/DELETE /store/carts/:id/points` (프로모션 할인 + 원장 차감).

import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheTag } from "./cookies"
import { revalidateTag } from "next/cache"

export async function applyPoints(
  cartId: string,
  points: number
): Promise<{ ok: boolean; error?: string }> {
  const headers = { ...(await getAuthHeaders()) }
  try {
    await sdk.client.fetch(`/store/carts/${cartId}/points`, {
      method: "POST",
      headers,
      body: { points },
    })
    revalidateTag(await getCacheTag("carts"))
    return { ok: true }
  } catch (e: any) {
    const msg = e?.message || "적립금 사용에 실패했습니다."
    return { ok: false, error: msg }
  }
}

export async function removePoints(
  cartId: string
): Promise<{ ok: boolean }> {
  const headers = { ...(await getAuthHeaders()) }
  try {
    await sdk.client.fetch(`/store/carts/${cartId}/points`, {
      method: "DELETE",
      headers,
    })
    revalidateTag(await getCacheTag("carts"))
  } catch {
    // ignore
  }
  return { ok: true }
}
