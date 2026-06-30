// 내 쿠폰함 데이터 계층 (실제 백엔드 연동)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트 `GET /store/coupons` 로 활성 프로모션(관리자 생성 코드)을 조회한다.
// (백엔드: src/api/store/coupons/route.ts · 표준 Medusa promotion)
// 코드 적용은 체크아웃의 표준 promotion 흐름에서 처리.

import { sdk } from "@lib/config"
import { getCacheOptions } from "./cookies"

export type Coupon = {
  id: string
  /** 체크아웃에서 입력할 프로모션 코드 */
  code: string
  name: string
  /** 할인 표기 (예: "10%", "5,000원") */
  benefit: string
  /** 최소 주문 금액(원) */
  min_order_amount: number
  /** 만료일 ISO 8601 (무기한이면 null) */
  expires_at: string | null
  used?: boolean
}

export type CouponSummary = {
  coupons: Coupon[]
  availableCount: number
}

const EMPTY: CouponSummary = { coupons: [], availableCount: 0 }

export async function listMyCoupons(customerId: string): Promise<CouponSummary> {
  void customerId
  const next = { ...(await getCacheOptions("coupons")) }
  try {
    const res = await sdk.client.fetch<CouponSummary>(`/store/coupons`, {
      method: "GET",
      next,
      cache: "force-cache",
    })
    return res ?? EMPTY
  } catch {
    return EMPTY
  }
}
