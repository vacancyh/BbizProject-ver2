// 적립금(포인트) 데이터 계층 (실제 백엔드 연동)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트 `GET /store/customers/me/points` 로 로그인 고객의 적립금을 조회한다.
// (백엔드: src/api/store/customers/me/points/route.ts · customer-point 모듈/point_ledger)
// 잔액/누적은 백엔드가 ledger amount 합산으로 계산해 반환.

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"

export type PointEntryType = "earn" | "redeem" | "expire"

export type PointEntry = {
  id: string
  /** 적립/사용/만료 */
  entry_type: PointEntryType
  /** 부호 있는 금액(원). earn +, redeem/expire − */
  amount: number
  /** 사유 */
  reason?: string
  /** 관련 주문 */
  order_id?: string
  /** 만료 예정 (ISO 8601) */
  expires_at?: string
  /** ISO 8601 */
  created_at: string
}

export type PointSummary = {
  /** 현재 보유 적립금 = ledger amount 합산 */
  balance: number
  /** 누적 적립 */
  total_earned: number
  /** 누적 사용(절대값) */
  total_used: number
}

export type CustomerPointsResult = {
  entries: PointEntry[]
  summary: PointSummary
}

const EMPTY: CustomerPointsResult = {
  entries: [],
  summary: { balance: 0, total_earned: 0, total_used: 0 },
}

export async function listCustomerPoints(
  customerId: string
): Promise<CustomerPointsResult> {
  void customerId
  const headers = { ...(await getAuthHeaders()) }
  try {
    const res = await sdk.client.fetch<CustomerPointsResult>(
      `/store/customers/me/points`,
      { method: "GET", headers, cache: "no-store" }
    )
    return res ?? EMPTY
  } catch {
    return EMPTY
  }
}
