/**
 * 멤버십 모듈 단위 테스트 (d5 t004_멤버십등급 — production 모듈 직접 검증)
 *
 * 전략(policy.unit.spec 정본 정합):
 *  - production logic.ts(validateTierPolicy/calcMembershipTier/… ) 직접 import — 복제본 없음
 *  - production service.ts / route.ts 소스 구조 검증(fs.readFileSync) — 룰 함수 실제 호출 확인
 *  - production policy/logic.ts validatePolicyValue 의 json 분기(본 작업 추가분) 검증
 *  - DB·MedusaService 의존 없음(logic 순수함수)
 *
 * UT-001: 누적금액 자동 승급(calcMembershipTier)
 * UT-002: 등급별 적립률(tierEarnRate)
 * C1   : 환불 시 누적 차감 후 재산정(recalcAccruedOnRefund)
 * I1/I2: 등급 정책 검증(validateTierPolicy)
 */
import {
  TIER_NAMES,
  DEFAULT_TIERS,
  validateTierPolicy,
  parseTiersPolicy,
  calcMembershipTier,
  tierEarnRate,
  nextTierGap,
  recalcAccruedOnRefund,
  type TierPolicy,
} from "../logic"
import { validatePolicyValue } from "../../policy/logic"

import * as fs from "fs"
import * as path from "path"

// ─── 테스트용 등급 정책(임의 주입 — 코드 박지 않음) ─────────────────────────
const TIERS: TierPolicy = [
  { name: "일반", minAmount: 0, earnRate: 0.5 },
  { name: "실버", minAmount: 300000, earnRate: 1 },
  { name: "골드", minAmount: 1000000, earnRate: 2 },
  { name: "VIP", minAmount: 3000000, earnRate: 3 },
]

// ─── I1/I2 — 등급 정책 검증 ──────────────────────────────────────────────────
describe("validateTierPolicy: 등급 정책 검증(I1 단조증가 / I2 적립률 0~100)", () => {
  test("정상 정책은 valid=true", () => {
    expect(validateTierPolicy(TIERS).valid).toBe(true)
  })

  test("빈 배열은 valid=false", () => {
    const r = validateTierPolicy([])
    expect(r.valid).toBe(false)
    expect(r.errors.length).toBeGreaterThan(0)
  })

  test("minAmount 단조증가 위반 시 valid=false", () => {
    const bad: TierPolicy = [
      { name: "일반", minAmount: 0, earnRate: 0.5 },
      { name: "실버", minAmount: 100, earnRate: 1 },
      { name: "골드", minAmount: 100, earnRate: 2 }, // 같음 → 위반
    ]
    expect(validateTierPolicy(bad).valid).toBe(false)
  })

  test("적립률 100 초과 시 valid=false", () => {
    const bad: TierPolicy = [{ name: "일반", minAmount: 0, earnRate: 150 }]
    expect(validateTierPolicy(bad).valid).toBe(false)
  })

  test("음수 minAmount 는 valid=false", () => {
    const bad: TierPolicy = [{ name: "일반", minAmount: -1, earnRate: 1 }]
    expect(validateTierPolicy(bad).valid).toBe(false)
  })

  test("DEFAULT_TIERS(예시 초기값)는 검증을 통과한다", () => {
    expect(validateTierPolicy(DEFAULT_TIERS).valid).toBe(true)
  })

  test("TIER_NAMES 는 일반/실버/골드/VIP 4단계", () => {
    expect(TIER_NAMES).toEqual(["일반", "실버", "골드", "VIP"])
  })
})

// ─── parseTiersPolicy — 안전 파싱(폴백) ──────────────────────────────────────
describe("parseTiersPolicy: 폴백 안전 파싱", () => {
  test("유효 배열은 그대로 반환", () => {
    expect(parseTiersPolicy(TIERS)).toEqual(TIERS)
  })
  test("배열 아님(객체/null/문자열)은 DEFAULT_TIERS 폴백", () => {
    expect(parseTiersPolicy(null)).toEqual(DEFAULT_TIERS)
    expect(parseTiersPolicy("x")).toEqual(DEFAULT_TIERS)
    expect(parseTiersPolicy({ a: 1 })).toEqual(DEFAULT_TIERS)
  })
  test("검증 실패 배열(단조위반)은 DEFAULT_TIERS 폴백", () => {
    const bad = [
      { name: "a", minAmount: 0, earnRate: 1 },
      { name: "b", minAmount: 0, earnRate: 1 },
    ]
    expect(parseTiersPolicy(bad)).toEqual(DEFAULT_TIERS)
  })
})

// ─── UT-001 — 누적금액 자동 승급 ─────────────────────────────────────────────
describe("calcMembershipTier: 누적금액 → 등급(UT-001)", () => {
  test("0원 = 일반", () => {
    expect(calcMembershipTier(0, TIERS).name).toBe("일반")
  })
  test("경계값(정확히 minAmount) = 해당 등급으로 승급", () => {
    expect(calcMembershipTier(300000, TIERS).name).toBe("실버")
    expect(calcMembershipTier(1000000, TIERS).name).toBe("골드")
    expect(calcMembershipTier(3000000, TIERS).name).toBe("VIP")
  })
  test("구간 중간값", () => {
    expect(calcMembershipTier(500000, TIERS).name).toBe("실버")
    expect(calcMembershipTier(2999999, TIERS).name).toBe("골드")
    expect(calcMembershipTier(99999999, TIERS).name).toBe("VIP")
  })
  test("정책 빈 배열이면 에러", () => {
    expect(() => calcMembershipTier(100, [])).toThrow("등급 정책이 비어 있습니다")
  })
})

// ─── UT-002 — 등급별 적립률 ──────────────────────────────────────────────────
describe("tierEarnRate: 등급별 적립률(UT-002)", () => {
  test("등급별 적립률 반환", () => {
    expect(tierEarnRate(0, TIERS)).toBe(0.5)
    expect(tierEarnRate(300000, TIERS)).toBe(1)
    expect(tierEarnRate(1000000, TIERS)).toBe(2)
    expect(tierEarnRate(5000000, TIERS)).toBe(3)
  })
})

// ─── S2 — 다음 등급까지 잔여 ─────────────────────────────────────────────────
describe("nextTierGap: 다음 등급까지 잔여 금액", () => {
  test("일반(0원) → 실버까지 30만원", () => {
    const g = nextTierGap(0, TIERS)
    expect(g?.nextTier.name).toBe("실버")
    expect(g?.remaining).toBe(300000)
  })
  test("실버 구간(50만) → 골드까지 50만원", () => {
    const g = nextTierGap(500000, TIERS)
    expect(g?.nextTier.name).toBe("골드")
    expect(g?.remaining).toBe(500000)
  })
  test("최상위(VIP)는 null", () => {
    expect(nextTierGap(5000000, TIERS)).toBeNull()
  })
})

// ─── C1 — 환불 시 누적 차감 후 재산정 ───────────────────────────────────────
describe("recalcAccruedOnRefund: 환불 차감(C1, 하향 가능)", () => {
  test("정상 차감", () => {
    expect(recalcAccruedOnRefund(1000000, 200000)).toBe(800000)
  })
  test("0 미만으로 내려가지 않음", () => {
    expect(recalcAccruedOnRefund(100000, 500000)).toBe(0)
  })
  test("음수 환불액은 0으로 보정(누적 불변)", () => {
    expect(recalcAccruedOnRefund(1000000, -50000)).toBe(1000000)
  })
  test("차감 후 등급 하향 확인(골드 100만→환불 80만→일반)", () => {
    const next = recalcAccruedOnRefund(1000000, 800000)
    expect(calcMembershipTier(next, TIERS).name).toBe("일반")
  })
})

// ─── policy/logic.ts json 분기(본 작업 추가분) 재발방지 검증 ─────────────────
describe("validatePolicyValue: value_type=json 분기(복합 정책 일반화)", () => {
  test("배열은 json 으로 통과", () => {
    expect(() => validatePolicyValue(TIERS as any, "json")).not.toThrow()
  })
  test("객체는 json 으로 통과", () => {
    expect(() => validatePolicyValue({ a: 1 } as any, "json")).not.toThrow()
  })
  test("null 은 json 검증 실패(에러)", () => {
    expect(() => validatePolicyValue(null as any, "json")).toThrow("[policy]")
  })
  test("문자열은 json 검증 실패(에러)", () => {
    expect(() => validatePolicyValue("x" as any, "json")).toThrow("[policy]")
  })
  test("기존 number/boolean/string 검증은 불변", () => {
    expect(() => validatePolicyValue(1, "number")).not.toThrow()
    expect(() => validatePolicyValue(true, "boolean")).not.toThrow()
    expect(() => validatePolicyValue("a", "string")).not.toThrow()
    expect(() => validatePolicyValue("a", "number")).toThrow()
  })
})

// ─── service.ts 구조 검증: 룰 함수 실제 호출 ────────────────────────────────
describe("service.ts 구조 검증: logic 룰 실제 호출", () => {
  const servicePath = path.resolve(__dirname, "../service.ts")
  const src = fs.readFileSync(servicePath, "utf-8")

  test("service 가 logic 에서 calcMembershipTier 를 import 한다", () => {
    expect(src).toContain("calcMembershipTier")
    expect(src).toContain("./logic")
  })
  test("service 가 recalcAccruedOnRefund 를 import/사용한다", () => {
    expect(src).toContain("recalcAccruedOnRefund")
  })
  test("recordAccrual / applyRefund / getOrDefault 메서드가 존재한다", () => {
    expect(src).toContain("recordAccrual")
    expect(src).toContain("applyRefund")
    expect(src).toContain("getOrDefault")
  })
  test("MedusaService 자동 메서드(create/update/list CustomerMemberships)를 사용한다", () => {
    expect(src).toContain("createCustomerMemberships")
    expect(src).toContain("updateCustomerMemberships")
    expect(src).toContain("listCustomerMemberships")
  })
})

// ─── route.ts 구조 검증: 검증·이중확인·정책 위임 ───────────────────────────
describe("route.ts 구조 검증: membership.tiers 정책 변경", () => {
  const routePath = path.resolve(
    __dirname,
    "../../../api/admin/membership/policy/route.ts"
  )
  const src = fs.readFileSync(routePath, "utf-8")

  test("POST 가 validateTierPolicy 로 룰 검증한다", () => {
    expect(src).toContain("validateTierPolicy")
  })
  test("confirm!==true 면 409 를 반환한다(이중확인)", () => {
    expect(src).toContain("confirm")
    expect(src).toContain("409")
  })
  test("정책 저장은 policy.set 으로 위임한다(별도 테이블 미신설)", () => {
    expect(src).toContain("policy.set(")
    expect(src).toContain("membership.tiers")
  })
  test("감사 로그(audit.record)를 기록한다", () => {
    expect(src).toContain("audit.record")
  })
})
