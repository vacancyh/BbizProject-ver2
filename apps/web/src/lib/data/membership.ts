// 회원 등급(멤버십) 데이터 계층 (실제 백엔드 연동)
// ─────────────────────────────────────────────────────────────
// 백엔드 store 라우트 `GET /store/customers/me/membership` 로 로그인 고객의 누적구매액·등급을 조회.
// (백엔드: src/api/store/customers/me/membership/route.ts · membership 모듈/customer_membership)
// 등급 구간/적립률/혜택표(TIER_POLICIES)와 다음 등급 계산은 스토어프론트에서 수행.

import { sdk } from "@lib/config"
import { getAuthHeaders } from "./cookies"
import type { MessageKey } from "@lib/i18n/messages"

/**
 * 등급 코드. 백엔드 `current_tier` 와 같은 값을 쓴다.
 * 화면에 찍을 이름은 `tier.name.*` 번역 키로 따로 관리한다(2026-08-10).
 */
export type MembershipTier = "일반" | "실버" | "골드" | "VIP"

/** 등급 코드 → 표시 이름 번역 키 */
export const TIER_NAME_KEY: Record<MembershipTier, MessageKey> = {
  일반: "tier.name.basic",
  실버: "tier.name.silver",
  골드: "tier.name.gold",
  VIP: "tier.name.vip",
}

export type TierPolicy = {
  tier: MembershipTier
  /** 이 등급 도달에 필요한 누적 구매액(원, 이상) */
  min_amount: number
  /** 구매 적립률(%) */
  earn_rate: number
  /** 등급 혜택 요약 — 값은 번역 키다(화면에서 t() 로 푼다) */
  benefits: MessageKey[]
}

export type CustomerMembership = {
  customer_id: string
  /** 누적 구매액(원) */
  accrued_amount: number
  current_tier: MembershipTier
  last_change_reason: "accrual" | "refund" | "manual"
}

export type MembershipResult = {
  membership: CustomerMembership
  /** 전체 등급 기준표 (낮은 등급 → 높은 등급) */
  tiers: TierPolicy[]
  /** 현재 등급 정책 */
  current: TierPolicy
  /** 다음 등급 (최고 등급이면 undefined) */
  next?: TierPolicy
  /** 다음 등급까지 남은 누적 구매액(원) */
  amount_to_next?: number
}

// 등급 기준표 (낮은 → 높은). mock 상수.
export const TIER_POLICIES: TierPolicy[] = [
  {
    tier: "일반",
    min_amount: 0,
    earn_rate: 1,
    benefits: ["tier.benefit.earn1", "tier.benefit.newCoupon"],
  },
  {
    tier: "실버",
    min_amount: 300_000,
    earn_rate: 2,
    benefits: [
      "tier.benefit.earn2",
      "tier.benefit.birthdayCoupon",
      "tier.benefit.freeShip1",
    ],
  },
  {
    tier: "골드",
    min_amount: 1_000_000,
    earn_rate: 3,
    benefits: [
      "tier.benefit.earn3",
      "tier.benefit.birthdayCoupon",
      "tier.benefit.freeShipUnlimited",
      "tier.benefit.exclusiveDeals",
    ],
  },
  {
    tier: "VIP",
    min_amount: 3_000_000,
    earn_rate: 5,
    benefits: [
      "tier.benefit.earn5",
      "tier.benefit.birthdayVipCoupon",
      "tier.benefit.freeShipUnlimited",
      "tier.benefit.exclusiveDeals",
      "tier.benefit.prioritySupport",
    ],
  },
]

/** 누적 구매액으로 등급 산정 (정책표 기준). */
export function resolveTier(accruedAmount: number): TierPolicy {
  let resolved = TIER_POLICIES[0]
  for (const policy of TIER_POLICIES) {
    if (accruedAmount >= policy.min_amount) {
      resolved = policy
    }
  }
  return resolved
}

export async function retrieveMembership(
  customerId: string
): Promise<MembershipResult> {
  void customerId
  const headers = { ...(await getAuthHeaders()) }

  let accrued_amount = 0
  let membership: CustomerMembership = {
    customer_id: customerId,
    accrued_amount: 0,
    current_tier: "일반",
    last_change_reason: "accrual",
  }

  try {
    const res = await sdk.client.fetch<{ membership: CustomerMembership | null }>(
      `/store/customers/me/membership`,
      { method: "GET", headers, cache: "no-store" }
    )
    if (res?.membership) {
      accrued_amount = res.membership.accrued_amount ?? 0
      membership = res.membership
    }
  } catch {
    // 폴백: 기본 등급(일반)
  }

  // 누적구매액 기준 등급 산정(백엔드 current_tier 와 정합 — 정책표는 프런트 보유)
  const current = resolveTier(accrued_amount)
  const currentIndex = TIER_POLICIES.findIndex((p) => p.tier === current.tier)
  const nextTier = TIER_POLICIES[currentIndex + 1]
  const amount_to_next = nextTier
    ? Math.max(0, nextTier.min_amount - accrued_amount)
    : undefined

  return {
    membership: { ...membership, current_tier: current.tier },
    tiers: TIER_POLICIES,
    current,
    next: nextTier,
    amount_to_next,
  }
}
