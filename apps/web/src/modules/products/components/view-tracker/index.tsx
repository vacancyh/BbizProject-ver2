"use client"

import { useEffect, useRef } from "react"

/**
 * 상품 조회수 트래커 — 상품 상세 진입 시 조회수 +1 기록(무비용, 베스트 랭킹 신호).
 *  - 클라이언트에서 POST /store/products/:id/view (상세가 SSG 여도 방문마다 실행)
 *  - 세션당 상품별 1회만 기록(뒤로가기/재렌더 중복 방지)
 *  - 실패해도 UX 영향 없음(조용히 무시)
 */
const ProductViewTracker = ({ productId }: { productId: string }) => {
  const fired = useRef(false)

  useEffect(() => {
    if (!productId || fired.current) return
    fired.current = true

    const sessionKey = `_viewed_${productId}`
    try {
      if (window.sessionStorage.getItem(sessionKey)) return
      window.sessionStorage.setItem(sessionKey, "1")
    } catch {
      // sessionStorage 불가 환경이면 그냥 기록 진행
    }

    const base = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
    const key = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
    if (!base || !key) return

    fetch(`${base}/store/products/${productId}/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": key,
      },
      keepalive: true,
    }).catch(() => {
      // ignore
    })
  }, [productId])

  return null
}

export default ProductViewTracker
