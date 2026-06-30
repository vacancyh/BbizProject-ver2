"use server"

// 위시리스트 데이터 계층 (쿠키 영속 + 실제 상품 fetch 하이브리드)
// ─────────────────────────────────────────────────────────────
// 백엔드 product-curation(wishlist) 모듈은 관리자측에만 있고 고객용 /store API가 없음.
// 그래서 "찜 목록(상품 id)"은 쿠키에 영속화하고, 상품 데이터는 실제 store API로 조회한다.
// → mock이지만 실제로 추가/삭제가 동작하는 사용 가능한 형태.
// 백엔드 store 위시 API 준비 시: 쿠키 대신 `/store/customers/me/wishlist` 로 교체.

import { cookies as nextCookies } from "next/headers"
import { HttpTypes } from "@medusajs/types"
import { listProducts } from "./products"

const COOKIE = "_wishlist"

export async function getWishlistIds(): Promise<string[]> {
  try {
    const cookies = await nextCookies()
    const raw = cookies.get(COOKIE)?.value
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []
  } catch {
    return []
  }
}

async function setWishlistIds(ids: string[]) {
  const cookies = await nextCookies()
  cookies.set(COOKIE, JSON.stringify(ids), {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export async function isInWishlist(productId: string): Promise<boolean> {
  return (await getWishlistIds()).includes(productId)
}

/** 토글: 찜되어 있으면 해제, 없으면 추가. 추가 여부를 반환. */
export async function toggleWishlist(productId: string): Promise<boolean> {
  const ids = await getWishlistIds()
  if (ids.includes(productId)) {
    await setWishlistIds(ids.filter((id) => id !== productId))
    return false
  }
  await setWishlistIds([productId, ...ids])
  return true
}

export async function removeFromWishlist(productId: string): Promise<void> {
  const ids = await getWishlistIds()
  await setWishlistIds(ids.filter((id) => id !== productId))
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
