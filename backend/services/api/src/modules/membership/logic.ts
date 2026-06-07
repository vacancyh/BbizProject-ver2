/**
 * 멤버십 등급 순수 로직 모듈 (백엔드 정본) — DB·MedusaService 의존 없음.
 *
 * d5 t004_멤버십등급 갭B 백엔드 모듈의 룰 엔진.
 *
 * ★ 단일 진실(§V0) 메모:
 *  - 동일 룰이 admin 앱(apps/admin/src/lib/members/membership-logic.ts)에도 존재한다.
 *  - 책임 레이어가 다르다: admin = 화면 즉시 표시/낙관적 UI, backend(본 파일) = 영속 권위 계산.
 *  - 향후 shared 패키지로 통합하여 물리적 단일화하는 것은 별도 과제(deferred). 그때까지
 *    "백엔드(본 파일)를 권위 정본"으로 보고, 등급 영속·재산정은 항상 본 모듈을 통한다.
 *
 * 정책(등급 구간/적립률)은 코드에 박지 않고 입력(TierPolicy)으로 주입받는다(Rule One).
 * 운영 기본값은 policy 모듈 `membership.tiers` 키에 저장하며, DEFAULT_TIERS 는 그 키가
 * 아직 없을 때의 "예시 초기값" 폴백일 뿐 확정 정책이 아니다.
 */

/** 등급명 (스펙 명시 — 일반/실버/골드/VIP) */
export const TIER_NAMES = ["일반", "실버", "골드", "VIP"] as const
export type TierName = (typeof TIER_NAMES)[number]

/** 등급 구간 1개 — minAmount 이상이면 해당 등급, earnRate=적립률(%) */
export type Tier = { name: string; minAmount: number; earnRate: number }
export type TierPolicy = Tier[]

export type PolicyValidation = { valid: boolean; errors: string[] }

/**
 * 예시 초기값(폴백) — policy `membership.tiers` 미설정 시에만 사용.
 * ⚠️ Rule One: 확정 정책 아님. 운영 정책은 사장님이 정책 화면/seed 로 확정한다.
 */
export const DEFAULT_TIERS: TierPolicy = [
  { name: "일반", minAmount: 0, earnRate: 0.5 },
  { name: "실버", minAmount: 300000, earnRate: 1 },
  { name: "골드", minAmount: 1000000, earnRate: 2 },
  { name: "VIP", minAmount: 3000000, earnRate: 3 },
]

/**
 * 등급 정책 검증 (I1 구간 단조증가 / I2 적립률 0~100)
 * - 최소 1개 구간, 첫 구간 minAmount=0 권장(검증은 단조증가 위주).
 */
export function validateTierPolicy(tiers: TierPolicy): PolicyValidation {
  const errors: string[] = []
  if (!Array.isArray(tiers) || !tiers.length) {
    errors.push("등급 구간이 비어 있습니다")
    return { valid: false, errors }
  }
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i]
    if (typeof t?.name !== "string" || !t.name.length) {
      errors.push(`구간 오류(index ${i}): 등급명이 필요합니다`)
    }
    if (typeof t?.minAmount !== "number" || !Number.isFinite(t.minAmount)) {
      errors.push(`구간 오류(${t?.name ?? i}): minAmount 는 유한 숫자여야 합니다`)
    } else if (t.minAmount < 0) {
      errors.push(`구간 오류(${t.name}): 금액은 0 이상이어야 합니다`)
    }
    if (typeof t?.earnRate !== "number" || !(t.earnRate >= 0 && t.earnRate <= 100)) {
      errors.push(`적립률 오류(${t?.name ?? i}): 0~100% 범위여야 합니다`)
    }
    // I1 단조 증가
    if (i > 0 && typeof t?.minAmount === "number" && t.minAmount <= tiers[i - 1].minAmount) {
      errors.push(`구간 오류: minAmount 는 단조 증가해야 합니다(${tiers[i - 1].name} → ${t.name})`)
    }
  }
  return { valid: errors.length === 0, errors }
}

/**
 * policy 모듈 등에서 받은 raw 값을 TierPolicy 로 안전 파싱.
 * - 배열이 아니거나 검증 실패 시 DEFAULT_TIERS 폴백(서버가 죽지 않게).
 */
export function parseTiersPolicy(raw: unknown): TierPolicy {
  if (!Array.isArray(raw)) return DEFAULT_TIERS
  const candidate = raw as TierPolicy
  return validateTierPolicy(candidate).valid ? candidate : DEFAULT_TIERS
}

/**
 * 누적 구매금액 → 등급 산정 (UT-001 자동 승급)
 * - accrued 이하 minAmount 중 가장 높은 구간 선택.
 * @throws 정책이 비어 있으면 Error
 */
export function calcMembershipTier(accruedAmount: number, tiers: TierPolicy): Tier {
  if (!tiers.length) throw new Error("등급 정책이 비어 있습니다")
  const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount)
  let result = sorted[0]
  for (const t of sorted) {
    if (accruedAmount >= t.minAmount) result = t
    else break
  }
  return result
}

/** 등급별 적립률(%) 반환 (UT-002) */
export function tierEarnRate(accruedAmount: number, tiers: TierPolicy): number {
  return calcMembershipTier(accruedAmount, tiers).earnRate
}

/** 다음 구간까지 남은 금액 (S2 다음 구간 표시). 최상위면 null. */
export function nextTierGap(
  accruedAmount: number,
  tiers: TierPolicy
): { nextTier: Tier; remaining: number } | null {
  const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount)
  for (const t of sorted) {
    if (t.minAmount > accruedAmount) {
      return { nextTier: t, remaining: t.minAmount - accruedAmount }
    }
  }
  return null
}

/**
 * 환불 시 누적금액 차감 후 재산정 (C1 — 하향 가능)
 * - 누적금액은 0 미만으로 내려가지 않음.
 */
export function recalcAccruedOnRefund(accruedAmount: number, refundAmount: number): number {
  return Math.max(0, accruedAmount - Math.max(0, refundAmount))
}
