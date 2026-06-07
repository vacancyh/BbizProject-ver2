/**
 * membership-logic 단위 테스트 (d5 t004_멤버십등급)
 * spec: dag/d5_회원관리/t004_멤버십등급.md §4/§9
 *  - UT-001 자동 승급 / UT-002 등급별 적립률 / C1 환불 차감 재산정 / I1·I2 정책 검증
 */
import { describe, it, expect } from "vitest";
import {
  validateTierPolicy,
  calcMembershipTier,
  tierEarnRate,
  nextTierGap,
  recalcAccruedOnRefund,
  type TierPolicy,
} from "./membership-logic";

// 테스트용 예시 정책(코드가 아닌 테스트에만 존재 — 정책 수치 발명 금지 원칙)
const POLICY: TierPolicy = [
  { name: "일반", minAmount: 0, earnRate: 1 },
  { name: "실버", minAmount: 100_000, earnRate: 2 },
  { name: "골드", minAmount: 500_000, earnRate: 3 },
  { name: "VIP", minAmount: 2_000_000, earnRate: 5 },
];

describe("validateTierPolicy (I1/I2)", () => {
  it("정상 정책 통과", () => {
    expect(validateTierPolicy(POLICY).valid).toBe(true);
  });
  it("빈 정책 거부", () => {
    expect(validateTierPolicy([]).valid).toBe(false);
  });
  it("단조 증가 위반 거부 (I1)", () => {
    const bad: TierPolicy = [
      { name: "일반", minAmount: 0, earnRate: 1 },
      { name: "실버", minAmount: 0, earnRate: 2 },
    ];
    expect(validateTierPolicy(bad).valid).toBe(false);
  });
  it("적립률 범위 위반 거부 (I2)", () => {
    const bad: TierPolicy = [{ name: "일반", minAmount: 0, earnRate: 150 }];
    const r = validateTierPolicy(bad);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("적립률"))).toBe(true);
  });
});

describe("calcMembershipTier (UT-001 자동 승급)", () => {
  it("구간별 등급 산정", () => {
    expect(calcMembershipTier(0, POLICY).name).toBe("일반");
    expect(calcMembershipTier(99_999, POLICY).name).toBe("일반");
    expect(calcMembershipTier(100_000, POLICY).name).toBe("실버");
    expect(calcMembershipTier(499_999, POLICY).name).toBe("실버");
    expect(calcMembershipTier(500_000, POLICY).name).toBe("골드");
    expect(calcMembershipTier(2_000_000, POLICY).name).toBe("VIP");
    expect(calcMembershipTier(9_999_999, POLICY).name).toBe("VIP");
  });
  it("정렬 안 된 정책도 정상 산정", () => {
    const unsorted: TierPolicy = [...POLICY].reverse();
    expect(calcMembershipTier(500_000, unsorted).name).toBe("골드");
  });
  it("빈 정책은 throw", () => {
    expect(() => calcMembershipTier(0, [])).toThrow();
  });
});

describe("tierEarnRate (UT-002)", () => {
  it("등급별 적립률", () => {
    expect(tierEarnRate(0, POLICY)).toBe(1);
    expect(tierEarnRate(100_000, POLICY)).toBe(2);
    expect(tierEarnRate(2_000_000, POLICY)).toBe(5);
  });
});

describe("nextTierGap (S2 다음 구간)", () => {
  it("다음 구간까지 남은 금액", () => {
    const gap = nextTierGap(50_000, POLICY);
    expect(gap?.nextTier.name).toBe("실버");
    expect(gap?.remaining).toBe(50_000);
  });
  it("최상위는 null", () => {
    expect(nextTierGap(3_000_000, POLICY)).toBeNull();
  });
});

describe("recalcAccruedOnRefund (C1 하향)", () => {
  it("환불액 차감", () => {
    expect(recalcAccruedOnRefund(600_000, 200_000)).toBe(400_000);
  });
  it("0 미만으로 안 내려감", () => {
    expect(recalcAccruedOnRefund(100_000, 500_000)).toBe(0);
  });
  it("차감 후 등급 하향 가능", () => {
    const after = recalcAccruedOnRefund(550_000, 100_000); // 450,000 → 실버
    expect(calcMembershipTier(after, POLICY).name).toBe("실버");
  });
});
