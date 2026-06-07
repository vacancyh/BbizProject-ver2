/**
 * 멤버십 등급 순수 로직 모듈 (d5 t004_멤버십등급 spec §4/§9 — 갭B 비즈니스 룰)
 *
 * - DOM/fetch/React 없는 순수 함수만 → vitest 단위 테스트 가능.
 * - 정책(등급 구간/적립률)은 임의 수치를 코드에 박지 않고 **입력(TierPolicy)으로 주입**받는다.
 *   (Rule One: 사장님 미확정 정책을 진실로 가정 금지 — 본 모듈은 룰 엔진만 책임.)
 * - 백엔드 영속화(membership_policy/customer_membership 모델·마이그레이션·구독자·cron)는
 *   갭B 신규 모듈 영역으로 본 도메인 deferred. 본 모듈은 등급 산정/검증 룰만 제공.
 *
 * UT-001: 구매금액 자동 승급(calcMembershipTier)
 * UT-002: 등급별 적립률 부여(tierEarnRate)
 * C1: 환불 시 누적금액 차감 후 재산정(recalcAccruedOnRefund)
 */

/** 등급명 (스펙 명시 — 일반/실버/골드/VIP) */
export const TIER_NAMES = ["일반", "실버", "골드", "VIP"] as const;
export type TierName = (typeof TIER_NAMES)[number];

/** 등급 구간 1개 — minAmount 이상이면 해당 등급, earnRate=적립률(%) */
export type Tier = { name: string; minAmount: number; earnRate: number };
export type TierPolicy = Tier[];

export type PolicyValidation = { valid: boolean; errors: string[] };

/**
 * 등급 정책 검증 (I1 구간 단조증가 / I2 적립률 0~100)
 * - 최소 1개 구간, 첫 구간 minAmount=0 권장(검증은 단조증가 위주).
 */
export function validateTierPolicy(tiers: TierPolicy): PolicyValidation {
  const errors: string[] = [];
  if (!tiers.length) {
    errors.push("등급 구간이 비어 있습니다");
    return { valid: false, errors };
  }
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    // I2 적립률 0~100
    if (!(t.earnRate >= 0 && t.earnRate <= 100)) {
      errors.push(`적립률 오류(${t.name}): 0~100% 범위여야 합니다`);
    }
    if (t.minAmount < 0) {
      errors.push(`구간 오류(${t.name}): 금액은 0 이상이어야 합니다`);
    }
    // I1 단조 증가
    if (i > 0 && t.minAmount <= tiers[i - 1].minAmount) {
      errors.push(`구간 오류: minAmount 는 단조 증가해야 합니다(${tiers[i - 1].name} → ${t.name})`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 누적 구매금액 → 등급 산정 (UT-001 자동 승급)
 * - accrued 이하 minAmount 중 가장 높은 구간 선택.
 * - 어떤 구간에도 못 미치면 첫(최저) 구간 반환.
 * @throws 정책이 비어 있으면 Error
 */
export function calcMembershipTier(accruedAmount: number, tiers: TierPolicy): Tier {
  if (!tiers.length) throw new Error("등급 정책이 비어 있습니다");
  const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
  let result = sorted[0];
  for (const t of sorted) {
    if (accruedAmount >= t.minAmount) result = t;
    else break;
  }
  return result;
}

/** 등급별 적립률(%) 반환 (UT-002) */
export function tierEarnRate(accruedAmount: number, tiers: TierPolicy): number {
  return calcMembershipTier(accruedAmount, tiers).earnRate;
}

/** 다음 구간까지 남은 금액 (S2 다음 구간 표시). 최상위면 null. */
export function nextTierGap(
  accruedAmount: number,
  tiers: TierPolicy
): { nextTier: Tier; remaining: number } | null {
  const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount);
  for (const t of sorted) {
    if (t.minAmount > accruedAmount) {
      return { nextTier: t, remaining: t.minAmount - accruedAmount };
    }
  }
  return null;
}

/**
 * 환불 시 누적금액 차감 후 재산정 (C1 — 하향 가능)
 * - 누적금액은 0 미만으로 내려가지 않음.
 */
export function recalcAccruedOnRefund(accruedAmount: number, refundAmount: number): number {
  return Math.max(0, accruedAmount - Math.max(0, refundAmount));
}
