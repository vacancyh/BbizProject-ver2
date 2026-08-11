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
  /**
   * 운영자가 캠페인에 붙인 이름. **없으면 null** —
   * 그때는 화면이 언어에 맞는 기본 문구("5,000원 할인 쿠폰" / "₩5,000 off")를 만든다.
   * 백엔드가 완성된 한국어 문장을 내려주면 영어 화면에서 손쓸 방법이 없다(2026-08-11 수정).
   */
  name: string | null
  /** 할인 종류 */
  discount_type: "percentage" | "fixed"
  /** percentage 면 퍼센트 수치, fixed 면 금액 */
  discount_value: number
  /** fixed 일 때의 통화 코드 */
  currency_code: string | null
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
