"use server"

// 위시리스트 데이터 계층 (하이브리드)
// ─────────────────────────────────────────────────────────────
// - 로그인 고객: 백엔드 서버 위시리스트(`/store/customers/me/wishlist`, product-curation 모듈) → 기기간 동기화.
// - 비회원: 쿠키(`_wishlist`)로 영속(게스트도 사용 가능).
// - 로그인 시: 쿠키 위시 → 서버로 머지(mergeGuestWishlistToServer) 후 쿠키 정리.
// 상품 데이터는 실제 store products API 로 조회(찜한 순서 유지).

import { cookies as nextCookies } from "next/headers"
import { HttpTypes } from "@medusajs/types"
import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"
import { listProducts } from "./products"

const COOKIE = "_wishlist"

async function isLoggedIn(): Promise<boolean> {
  const h = await getAuthHeaders()
  return "authorization" in h
}

// ─── 쿠키(게스트) ───
async function getCookieIds(): Promise<string[]> {
  try {
    const cookies = await nextCookies()
    const raw = cookies.get(COOKIE)?.value
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}
async function setCookieIds(ids: string[]) {
  const cookies = await nextCookies()
  cookies.set(COOKIE, JSON.stringify(ids), {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

// ─── 서버(로그인) ───
async function getServerIds(): Promise<string[]> {
  try {
    const headers = { ...(await getAuthHeaders()) }
    const res = await sdk.client.fetch<{ product_ids: string[] }>(
      "/store/customers/me/wishlist",
      { method: "GET", headers, cache: "no-store" }
    )
    return res?.product_ids ?? []
  } catch {
    return []
  }
}

// ─── 공개 API (하이브리드) ───
export async function getWishlistIds(): Promise<string[]> {
  return (await isLoggedIn()) ? getServerIds() : getCookieIds()
}

export async function isInWishlist(productId: string): Promise<boolean> {
  return (await getWishlistIds()).includes(productId)
}

/** 토글: 찜되어 있으면 해제, 없으면 추가. 추가 여부 반환. */
export async function toggleWishlist(productId: string): Promise<boolean> {
  if (await isLoggedIn()) {
    const headers = { ...(await getAuthHeaders()) }
    const has = (await getServerIds()).includes(productId)
    if (has) {
      await sdk.client
        .fetch(`/store/customers/me/wishlist/${productId}`, {
          method: "DELETE",
          headers,
        })
        .catch(() => {})
      return false
    }
    await sdk.client
      .fetch("/store/customers/me/wishlist", {
        method: "POST",
        headers,
        body: { product_id: productId },
      })
      .catch(() => {})
    return true
  }
  // 게스트: 쿠키
  const ids = await getCookieIds()
  if (ids.includes(productId)) {
    await setCookieIds(ids.filter((id) => id !== productId))
    return false
  }
  await setCookieIds([productId, ...ids])
  return true
}

export async function removeFromWishlist(productId: string): Promise<void> {
  if (await isLoggedIn()) {
    const headers = { ...(await getAuthHeaders()) }
    await sdk.client
      .fetch(`/store/customers/me/wishlist/${productId}`, {
        method: "DELETE",
        headers,
      })
      .catch(() => {})
    return
  }
  const ids = await getCookieIds()
  await setCookieIds(ids.filter((id) => id !== productId))
}

/** 로그인 직후 호출: 게스트(쿠키) 위시를 서버로 머지하고 쿠키 정리. */
export async function mergeGuestWishlistToServer(): Promise<void> {
  try {
    const cookieIds = await getCookieIds()
    if (!cookieIds.length) return
    const headers = { ...(await getAuthHeaders()) }
    if (!("authorization" in headers)) return
    await sdk.client.fetch("/store/customers/me/wishlist", {
      method: "POST",
      headers,
      body: { product_ids: cookieIds },
    })
    await setCookieIds([]) // 머지 후 쿠키 비움
  } catch {
    // 실패해도 치명적 아님
  }
}

/** 찜한 상품들을 실제 store API로 조회 (찜한 순서 유지). */
export async function listWishlistProducts(
  countryCode: string
): Promise<HttpTypes.StoreProduct[]> {
  const ids = await getWishlistIds()
  if (!ids.length) return []

  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: {
      id: ids,
      limit: ids.length,
    } as HttpTypes.StoreProductListParams,
  })

  const byId = new Map(products.map((p) => [p.id, p]))
  return ids
    .map((id) => byId.get(id))
    .filter((p): p is HttpTypes.StoreProduct => Boolean(p))
}
