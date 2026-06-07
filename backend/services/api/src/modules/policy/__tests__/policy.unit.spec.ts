/**
 * 정책 저장소 단위 테스트 — t007 §9 / unit_064 (production 모듈 직접 검증)
 *
 * UT-001: 정책 수정(SUPER) + 이중확인 + 이력
 *   - requireConfirm(confirm): confirm=true 이면 통과, 아니면 에러
 *   - validatePolicyValue: 타입별(number/boolean/string) 검증 — 일치=통과, 불일치=에러
 *   - isSuperRole: super/null = true, operation/cs/marketer = false
 *   - service.ts 가 requireConfirm·validatePolicyValue 를 실제 호출하는 구조 검증
 *
 * UT-002: OPERATION 이하 수정 시도 → 403 거부
 *   - isSuperRole("operation") = false → 미들웨어 rbac guard 차단 경로 검증
 *   - middlewares.ts 가 policies 메뉴에 rbacGuard 를 적용하는 구조 검증
 *   - evaluatePermission("operation", "policies", "update", ...) 기반 시뮬레이션
 *
 * 테스트 전략:
 *  - production logic.ts (requireConfirm, validatePolicyValue, isSuperRole) 직접 import
 *  - production rbac/logic.ts (evaluatePermission) 직접 import
 *  - production rbac/seed/defaults.ts (buildDefaultPermissions) 직접 import
 *  - production service.ts 소스 구조 검증(fs.readFileSync)
 *  - production middlewares.ts 소스 구조 검증(fs.readFileSync)
 *  - 복제본(사본 클래스/함수) 없음 — 모든 검증이 production 함수를 호출
 *  - DB·MedusaService 의존 없음 (logic.ts 가 순수 함수이므로 mock 불필요)
 */

// ─── production 모듈 직접 import ───────────────────────────────────────────────
import {
  requireConfirm,
  validatePolicyValue,
  isSuperRole,
  type PolicyValueType,
} from "../logic"
import { evaluatePermission } from "../../rbac/logic"
import { buildDefaultPermissions } from "../../rbac/seed/defaults"
import type { PermRow } from "../../rbac/logic"

// 구조 검증용 fs/path
import * as fs from "fs"
import * as path from "path"

// ─── 테스트용 픽스처 ─────────────────────────────────────────────────────────

/** 실제 권한 매트릭스 캐시 */
const ALL_PERMS: PermRow[] = buildDefaultPermissions()

function permsFor(roleKey: string): PermRow[] {
  return ALL_PERMS.filter((r) => r.role_key === roleKey)
}

// ─── UT-001 — 정책 수정(SUPER) + 이중확인 + 이력 ────────────────────────────

describe("UT-001: 정책 수정(SUPER) + 이중확인 + 이력", () => {

  // ── requireConfirm: 이중확인 게이트 ────────────────────────────────────────

  test("confirm=true 이면 requireConfirm 이 에러를 던지지 않는다(이중확인 통과)", () => {
    expect(() => requireConfirm(true)).not.toThrow()
  })

  test("confirm=false 이면 requireConfirm 이 에러를 던진다(이중확인 미수행 차단)", () => {
    expect(() => requireConfirm(false)).toThrow("[policy] 정책 변경에는 이중확인(confirm=true)이 필요합니다.")
  })

  test("confirm=undefined 이면 requireConfirm 이 에러를 던진다", () => {
    expect(() => requireConfirm(undefined)).toThrow("[policy]")
  })

  test("confirm=null 이면 requireConfirm 이 에러를 던진다", () => {
    expect(() => requireConfirm(null)).toThrow("[policy]")
  })

  test("confirm='true'(문자열) 이면 requireConfirm 이 에러를 던진다(엄격 === 비교)", () => {
    expect(() => requireConfirm("true")).toThrow("[policy]")
  })

  // ── validatePolicyValue: 값 타입 검증 ────────────────────────────────────

  test("value_type=number 일 때 숫자(유한값)는 통과한다", () => {
    expect(() => validatePolicyValue(72, "number")).not.toThrow()
    expect(() => validatePolicyValue(0, "number")).not.toThrow()
    expect(() => validatePolicyValue(3.14, "number")).not.toThrow()
  })

  test("value_type=number 일 때 문자열은 에러를 던진다", () => {
    expect(() => validatePolicyValue("72", "number")).toThrow("[policy] 정책 값 형식 오류")
  })

  test("value_type=number 일 때 Infinity 는 에러를 던진다(유한값 아님)", () => {
    expect(() => validatePolicyValue(Infinity, "number")).toThrow("[policy] 정책 값 형식 오류")
  })

  test("value_type=number 일 때 NaN 은 에러를 던진다", () => {
    expect(() => validatePolicyValue(NaN, "number")).toThrow("[policy] 정책 값 형식 오류")
  })

  test("value_type=boolean 일 때 true/false 는 통과한다", () => {
    expect(() => validatePolicyValue(true, "boolean")).not.toThrow()
    expect(() => validatePolicyValue(false, "boolean")).not.toThrow()
  })

  test("value_type=boolean 일 때 숫자(1/0)는 에러를 던진다", () => {
    expect(() => validatePolicyValue(1, "boolean")).toThrow("[policy] 정책 값 형식 오류")
    expect(() => validatePolicyValue(0, "boolean")).toThrow("[policy] 정책 값 형식 오류")
  })

  test("value_type=string 일 때 문자열은 통과한다", () => {
    expect(() => validatePolicyValue("홍길동", "string")).not.toThrow()
    expect(() => validatePolicyValue("", "string")).not.toThrow()
  })

  test("value_type=string 일 때 숫자는 에러를 던진다", () => {
    expect(() => validatePolicyValue(123, "string")).toThrow("[policy] 정책 값 형식 오류")
  })

  // ── isSuperRole: SUPER 등급 판정 ───────────────────────────────────────────

  test("roleKey=null(미할당)은 isSuperRole=true 이다(C1 부트스트랩 정책 정합)", () => {
    expect(isSuperRole(null)).toBe(true)
  })

  test("roleKey='super' 는 isSuperRole=true 이다", () => {
    expect(isSuperRole("super")).toBe(true)
  })

  test("roleKey='operation' 은 isSuperRole=false 이다", () => {
    expect(isSuperRole("operation")).toBe(false)
  })

  test("roleKey='cs' 는 isSuperRole=false 이다", () => {
    expect(isSuperRole("cs")).toBe(false)
  })

  test("roleKey='marketer' 는 isSuperRole=false 이다", () => {
    expect(isSuperRole("marketer")).toBe(false)
  })

  // ── service.ts 구조 검증: logic 함수를 실제 호출 ──────────────────────────

  const servicePath = path.resolve(__dirname, "../service.ts")
  const serviceSource = fs.readFileSync(servicePath, "utf-8")

  test("service.ts 가 requireConfirm 을 policy/logic 에서 import 한다", () => {
    expect(serviceSource).toContain("requireConfirm")
    expect(serviceSource).toContain("./logic")
  })

  test("service.ts 가 validatePolicyValue 를 policy/logic 에서 import 한다", () => {
    expect(serviceSource).toContain("validatePolicyValue")
    expect(serviceSource).toContain("./logic")
  })

  test("service.ts set 메서드가 requireConfirm(confirm) 을 실제 호출한다", () => {
    expect(serviceSource).toContain("requireConfirm(confirm)")
  })

  test("service.ts set 메서드가 validatePolicyValue(value, valueType) 를 실제 호출한다", () => {
    expect(serviceSource).toContain("validatePolicyValue(value, valueType)")
  })

  test("service.ts set 메서드가 createPolicyHistories 로 이력을 적재한다", () => {
    expect(serviceSource).toContain("createPolicyHistories")
    expect(serviceSource).toContain("policy_key")
    expect(serviceSource).toContain("before")
    expect(serviceSource).toContain("after")
  })
})

// ─── UT-002 — OPERATION 이하 수정 시도 → 403 거부 ───────────────────────────

describe("UT-002: OPERATION 이하 수정 시도 → 403 거부", () => {

  // ── isSuperRole 기반: operation/cs/marketer 는 정책 write 불가 ──────────

  test("operation 등급은 isSuperRole=false → 정책 write 권한 없음", () => {
    expect(isSuperRole("operation")).toBe(false)
  })

  test("cs 등급은 isSuperRole=false → 정책 write 권한 없음", () => {
    expect(isSuperRole("cs")).toBe(false)
  })

  test("marketer 등급은 isSuperRole=false → 정책 write 권한 없음", () => {
    expect(isSuperRole("marketer")).toBe(false)
  })

  // ── evaluatePermission 기반: rbac seed 권한 매트릭스 직접 검증 ─────────────

  test("operation 등급은 policies 메뉴 update 가 차단된다(rbac 권한 매트릭스)", () => {
    const opPerms = permsFor("operation")
    // policies 메뉴에 operation이 write 권한 없음 → false
    // (seed defaults에 policies = READ-only 또는 미매핑 시 false)
    const result = evaluatePermission("operation", "policies", "update", opPerms)
    expect(result).toBe(false)
  })

  test("operation 등급은 policies 메뉴 create 가 차단된다", () => {
    const opPerms = permsFor("operation")
    expect(evaluatePermission("operation", "policies", "create", opPerms)).toBe(false)
  })

  test("super 등급은 policies 메뉴 update 가 허용된다(write 권한 있음)", () => {
    // super = 항상 true (evaluatePermission 내부 단락)
    expect(evaluatePermission("super", "policies", "update", [])).toBe(true)
  })

  test("null(미할당) 등급은 policies 메뉴 update 가 허용된다(C1 부트스트랩)", () => {
    expect(evaluatePermission(null, "policies", "update", [])).toBe(true)
  })

  // ── middlewares.ts 구조 검증: policies 메뉴 rbac guard 적용 ───────────────

  const middlewaresPath = path.resolve(
    __dirname,
    "../../../api/middlewares.ts"
  )
  const middlewaresSource = fs.readFileSync(middlewaresPath, "utf-8")

  test("middlewares.ts 가 /admin/policy 경로를 policies 메뉴로 매핑한다", () => {
    expect(middlewaresSource).toContain("/admin/policy")
    expect(middlewaresSource).toContain("policies")
  })

  test("middlewares.ts 가 rbacGuard 를 적용한다(403 차단 경로 존재)", () => {
    expect(middlewaresSource).toContain("rbacGuard")
    expect(middlewaresSource).toContain("403")
    expect(middlewaresSource).toContain("RBAC_FORBIDDEN")
  })

  test("middlewares.ts 가 write 메서드(POST/PUT/PATCH/DELETE)에만 rbac 검사를 적용한다", () => {
    expect(middlewaresSource).toContain("WRITE_METHODS")
    // GET 은 rbac 검사 생략
    expect(middlewaresSource).toContain("return next()")
  })

  // ── route.ts 구조 검증: confirm 체크 + 403 선행(이중확인 미수행 409 처리) ──

  const routePath = path.resolve(
    __dirname,
    "../../../api/admin/policy/policies/[key]/route.ts"
  )
  const routeSource = fs.readFileSync(routePath, "utf-8")

  test("route.ts 가 confirm=true 가 아닐 때 409 를 반환하는 분기가 있다", () => {
    expect(routeSource).toContain("confirm")
    expect(routeSource).toContain("409")
  })

  test("route.ts 가 policy.set() 을 호출하여 정책을 변경한다", () => {
    expect(routeSource).toContain("policy.set(")
    expect(routeSource).toContain("body.value")
  })

  test("route.ts 가 감사 로그(audit.record)를 기록한다", () => {
    expect(routeSource).toContain("audit.record")
    expect(routeSource).toContain("정책 변경")
  })
})
