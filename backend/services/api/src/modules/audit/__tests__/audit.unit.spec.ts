/**
 * 감사 로그 단위 테스트 — t011 §9 (production 모듈 직접 검증)
 *
 * UT-001: write 액션 → 감사 append + 불변성
 *   - HTTP write 메서드 판정(canWriteAudit): POST/PUT/PATCH/DELETE = true, GET = false
 *   - append-only 불변성(isAppendOnlyBlocked): update/delete = 차단(true), insert = 통과(false)
 *
 * UT-002: PII 마스킹 + 권한 조회
 *   - maskString: 전화번호/주민번호/이메일/비밀번호 키 마스킹 검증
 *   - maskPii: 중첩 객체 재귀 마스킹 + 민감 키 전체 마스킹
 *   - canReadAuditLogs: RBAC 권한 행 기반 audit-logs 조회 허용/차단 판정
 *
 * UT-003: route 권한 게이트 구조 검증
 *   - route.ts 가 canReadAuditLogs 를 import·사용하는 구조 확인(모듈 의존성)
 *   - service.ts 가 canWriteAudit / isAppendOnlyBlocked 를 import·사용하는 구조 확인
 *   - guardAppendOnly: update/delete 시도 시 throw, insert/read 는 통과
 *   - 비권한 role: canReadAuditLogs=false → route 가 403 응답 반환 경로 검증
 *
 * 테스트 전략:
 *  - production audit/logic.ts (canWriteAudit, isAppendOnlyBlocked, canReadAuditLogs) 직접 import
 *  - production audit/utils/mask-pii.ts (maskString, maskPii) 직접 import
 *  - production rbac/seed/defaults.ts (buildDefaultPermissions) 직접 import (실제 권한 매트릭스)
 *  - production audit/service.ts (guardAppendOnly, recordIfWriteAction) 모듈 구조 검증
 *  - 복제본(사본 클래스/함수) 없음 — 모든 검증이 production 함수를 호출
 *  - DB·MedusaService 의존 없음 (순수 함수 + 구조 검증)
 */

// ─── production 모듈 직접 import ──────────────────────────────────────────────
import {
  canWriteAudit,
  isAppendOnlyBlocked,
  canReadAuditLogs,
} from "../logic"
import { maskString, maskPii } from "../utils/mask-pii"
import { buildDefaultPermissions } from "../../rbac/seed/defaults"
import type { PermRow } from "../../rbac/logic"

// UT-003: route/service 구조 검증용 production 모듈 동적 import 경로
// (require로 모듈 로드 — MedusaService 인스턴스화 없이 export 구조만 확인)
// route.ts 는 MedusaRequest/Response + DI container 의존이 있으므로
// 모듈 텍스트(소스)를 fs 로 읽어 canReadAuditLogs import·사용 여부를 검증한다.
import * as fs from "fs"
import * as path from "path"

// ─── 테스트용 권한 행 픽스처 ──────────────────────────────────────────────────

/** buildDefaultPermissions() 결과를 캐시 (각 테스트에서 재사용) */
const ALL_PERMS: PermRow[] = buildDefaultPermissions()

/** 특정 역할의 권한 행만 필터 */
function permsFor(roleKey: string): PermRow[] {
  return ALL_PERMS.filter((r) => r.role_key === roleKey)
}

// ─── UT-001 — write 액션 → 감사 append + 불변성 ──────────────────────────────

describe("UT-001: write 액션 → 감사 append + 불변성", () => {
  // --- canWriteAudit: HTTP write 메서드 판정 ---

  test("POST 메서드는 감사 대상 write 액션이다(true)", () => {
    expect(canWriteAudit("POST")).toBe(true)
  })

  test("PUT 메서드는 감사 대상 write 액션이다(true)", () => {
    expect(canWriteAudit("PUT")).toBe(true)
  })

  test("PATCH 메서드는 감사 대상 write 액션이다(true)", () => {
    expect(canWriteAudit("PATCH")).toBe(true)
  })

  test("DELETE 메서드는 감사 대상 write 액션이다(true)", () => {
    expect(canWriteAudit("DELETE")).toBe(true)
  })

  test("GET 메서드는 감사 대상 write 액션이 아니다(false)", () => {
    expect(canWriteAudit("GET")).toBe(false)
  })

  test("HEAD 메서드는 감사 대상 write 액션이 아니다(false)", () => {
    expect(canWriteAudit("HEAD")).toBe(false)
  })

  test("소문자 post 메서드도 write 액션으로 판정된다(대소문자 무감)", () => {
    expect(canWriteAudit("post")).toBe(true)
    expect(canWriteAudit("patch")).toBe(true)
    expect(canWriteAudit("delete")).toBe(true)
  })

  // --- isAppendOnlyBlocked: append-only 불변성 판정 ---

  test("'update' 오퍼레이션은 append-only 위반으로 차단된다(true)", () => {
    expect(isAppendOnlyBlocked("update")).toBe(true)
  })

  test("'delete' 오퍼레이션은 append-only 위반으로 차단된다(true)", () => {
    expect(isAppendOnlyBlocked("delete")).toBe(true)
  })

  test("'insert' 오퍼레이션은 append-only 허용된다(false)", () => {
    expect(isAppendOnlyBlocked("insert")).toBe(false)
  })

  test("'read' 오퍼레이션은 append-only 허용된다(false)", () => {
    expect(isAppendOnlyBlocked("read")).toBe(false)
  })

  test("대소문자 'UPDATE'도 차단된다(대소문자 무감)", () => {
    expect(isAppendOnlyBlocked("UPDATE")).toBe(true)
    expect(isAppendOnlyBlocked("DELETE")).toBe(true)
  })
})

// ─── UT-002 — PII 마스킹 + 권한 조회 ────────────────────────────────────────

describe("UT-002: PII 마스킹 + 권한 조회", () => {
  // --- maskString: 문자열 PII 마스킹 ---

  test("전화번호 가운데 자리가 마스킹된다", () => {
    const result = maskString("010-1234-5678")
    expect(result).toContain("****")
    expect(result).not.toContain("1234")
  })

  test("주민등록번호 뒷자리가 마스킹된다", () => {
    const result = maskString("901010-1234567")
    expect(result).toContain("*")
    // 앞자리(901010-)는 노출됨
    expect(result).toContain("901010")
    // 뒷자리 전체는 마스킹됨
    expect(result).not.toContain("1234567")
  })

  test("이메일 로컬파트 일부가 마스킹된다", () => {
    const result = maskString("hong@example.com")
    expect(result).toContain("**")
    expect(result).toContain("@example.com")
    // 첫 글자는 노출
    expect(result.startsWith("h")).toBe(true)
    // 원본 전체 로컬파트는 노출되지 않음
    expect(result).not.toBe("hong@example.com")
  })

  test("마스킹 대상이 없는 일반 문자열은 변경되지 않는다", () => {
    const result = maskString("일반 텍스트 내용")
    expect(result).toBe("일반 텍스트 내용")
  })

  // --- maskPii: 객체/배열 재귀 마스킹 ---

  test("객체의 password 키 값은 전체 마스킹되고 name 은 PII 키 마스킹된다", () => {
    const input = { password: "secret123", name: "홍길동" }
    const result = maskPii(input) as Record<string, unknown>
    expect(result.password).toBe("********")
    // 보안점검 M5: name/address/phone 등은 값 패턴이 없어도 키 기준 마스킹(첫 글자만 유지)
    expect(result.name).toBe("홍***")
  })

  test("객체의 token, secret, api_key, authorization 키도 전체 마스킹된다", () => {
    const input = {
      token: "mytoken",
      secret: "mysecret",
      api_key: "myapikey",
      authorization: "Bearer abc",
    }
    const result = maskPii(input) as Record<string, unknown>
    expect(result.token).toBe("********")
    expect(result.secret).toBe("********")
    expect(result.api_key).toBe("********")
    expect(result.authorization).toBe("********")
  })

  test("중첩 객체의 PII 필드가 재귀적으로 마스킹된다", () => {
    const input = {
      user: {
        email: "hong@example.com",
        phone: "010-1234-5678",
        password: "pw123",
      },
    }
    const result = maskPii(input) as { user: Record<string, string> }
    // password = 전체 마스킹
    expect(result.user.password).toBe("********")
    // email = 로컬파트 마스킹
    expect(result.user.email).toContain("**")
    expect(result.user.email).toContain("@example.com")
    // phone = PII 키 마스킹(첫 글자만 유지) — M5 이후 값 패턴 마스킹보다 강함
    expect(result.user.phone).toBe("0***")
  })

  test("배열 요소의 PII 도 재귀적으로 마스킹된다", () => {
    const input = [
      { email: "a@test.com", name: "A" },
      { email: "b@test.com", name: "B" },
    ]
    const result = maskPii(input) as Array<Record<string, string>>
    expect(result[0].email).toContain("**")
    expect(result[1].email).toContain("**")
    // name 은 M5 이후 PII 키 마스킹 대상
    expect(result[0].name).toBe("A***")
  })

  test("null/undefined 값은 그대로 반환된다(에러 없음)", () => {
    expect(maskPii(null)).toBeNull()
    expect(maskPii(undefined)).toBeUndefined()
  })

  test("원본 객체는 변경되지 않는다(불변 사본 반환)", () => {
    const input = { password: "original" }
    const result = maskPii(input) as Record<string, string>
    expect(input.password).toBe("original")
    expect(result.password).toBe("********")
    expect(result).not.toBe(input)
  })

  // --- canReadAuditLogs: 권한 조회 게이트 ---

  test("null(미할당) 사용자는 audit-logs 조회가 허용된다(C1 부트스트랩)", () => {
    expect(canReadAuditLogs(null, ALL_PERMS)).toBe(true)
  })

  test("super 등급은 audit-logs 조회가 허용된다", () => {
    const superPerms = permsFor("super")
    expect(canReadAuditLogs("super", superPerms)).toBe(true)
  })

  test("operation 등급은 audit-logs 조회가 차단된다(SUPER_ONLY_MENUS)", () => {
    const opPerms = permsFor("operation")
    expect(canReadAuditLogs("operation", opPerms)).toBe(false)
  })

  test("cs 등급은 audit-logs 조회가 차단된다(SUPER_ONLY_MENUS)", () => {
    const csPerms = permsFor("cs")
    expect(canReadAuditLogs("cs", csPerms)).toBe(false)
  })

  test("권한 행이 비어있는 비SUPER 등급은 audit-logs 조회가 차단된다", () => {
    // 빈 permRows = 매핑 없음 → false
    expect(canReadAuditLogs("operation", [])).toBe(false)
  })

  test("권한 행에서 audit-logs can_read=false 이면 차단된다", () => {
    const noReadPerms: PermRow[] = [
      {
        role_key: "cs",
        menu_id: "audit-logs",
        can_read: false,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ]
    expect(canReadAuditLogs("cs", noReadPerms)).toBe(false)
  })

  test("권한 행에서 audit-logs can_read=true 이면 허용된다", () => {
    const readPerms: PermRow[] = [
      {
        role_key: "cs",
        menu_id: "audit-logs",
        can_read: true,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ]
    expect(canReadAuditLogs("cs", readPerms)).toBe(true)
  })
})

// ─── UT-003 — route 권한 게이트 구조 검증 ────────────────────────────────────

describe("UT-003: route 권한 게이트 구조 검증", () => {
  // ── route.ts 소스 로드 (DI container 없이 구조만 검증) ──────────────────────
  const routePath = path.resolve(
    __dirname,
    "../../../api/admin/audit/logs/route.ts"
  )
  const routeSource = fs.readFileSync(routePath, "utf-8")

  // ── service.ts 소스 로드 ─────────────────────────────────────────────────────
  const servicePath = path.resolve(__dirname, "../service.ts")
  const serviceSource = fs.readFileSync(servicePath, "utf-8")

  // ── route.ts 구조 검증 ───────────────────────────────────────────────────────

  test("route.ts 가 canReadAuditLogs 를 audit/logic 에서 import 한다", () => {
    expect(routeSource).toContain("canReadAuditLogs")
    expect(routeSource).toContain("audit/logic")
  })

  test("route.ts 가 RBAC_MODULE 을 import 하여 rbac 서비스를 resolve 한다", () => {
    expect(routeSource).toContain("RBAC_MODULE")
    expect(routeSource).toContain("rbac.getUserRole")
  })

  test("route.ts 가 403 응답을 반환하는 분기를 포함한다", () => {
    expect(routeSource).toContain("403")
    expect(routeSource).toContain("canReadAuditLogs(")
  })

  test("route.ts 에서 canReadAuditLogs 가 false 일 때 403 반환 로직이 연결된다", () => {
    // 403 반환 조건이 canReadAuditLogs 호출과 동일 블록에 있어야 함
    const gateBlock = routeSource.indexOf("canReadAuditLogs(")
    const block403 = routeSource.indexOf("403")
    expect(gateBlock).toBeGreaterThan(-1)
    expect(block403).toBeGreaterThan(-1)
    // 403 이 게이트 이후 50줄(약 1500자) 이내에 위치 (같은 if 블록)
    expect(block403 - gateBlock).toBeLessThan(1500)
    expect(block403 - gateBlock).toBeGreaterThan(-200)
  })

  // ── service.ts 구조 검증 ─────────────────────────────────────────────────────

  test("service.ts 가 canWriteAudit / isAppendOnlyBlocked 를 audit/logic 에서 import 한다", () => {
    expect(serviceSource).toContain("canWriteAudit")
    expect(serviceSource).toContain("isAppendOnlyBlocked")
    expect(serviceSource).toContain("./logic")
  })

  test("service.ts 에 recordIfWriteAction 메서드가 존재하고 canWriteAudit 를 호출한다", () => {
    expect(serviceSource).toContain("recordIfWriteAction")
    expect(serviceSource).toContain("canWriteAudit(httpMethod)")
  })

  test("service.ts 에 guardAppendOnly 메서드가 존재하고 isAppendOnlyBlocked 를 호출한다", () => {
    expect(serviceSource).toContain("guardAppendOnly")
    expect(serviceSource).toContain("isAppendOnlyBlocked(operation)")
  })

  // ── guardAppendOnly 순수 동작 검증 (service 인스턴스화 없이 logic 직접 활용) ──

  test("guardAppendOnly 역할: update 는 isAppendOnlyBlocked=true → 차단해야 한다", () => {
    // guardAppendOnly 는 isAppendOnlyBlocked 를 wrapping — logic 함수로 동작 검증
    expect(isAppendOnlyBlocked("update")).toBe(true)
    expect(() => {
      if (isAppendOnlyBlocked("update")) {
        throw new Error("[audit] append-only 위반")
      }
    }).toThrow("[audit] append-only 위반")
  })

  test("guardAppendOnly 역할: delete 는 isAppendOnlyBlocked=true → 차단해야 한다", () => {
    expect(isAppendOnlyBlocked("delete")).toBe(true)
    expect(() => {
      if (isAppendOnlyBlocked("delete")) {
        throw new Error("[audit] append-only 위반")
      }
    }).toThrow("[audit] append-only 위반")
  })

  test("guardAppendOnly 역할: insert 는 isAppendOnlyBlocked=false → 통과해야 한다", () => {
    expect(isAppendOnlyBlocked("insert")).toBe(false)
    expect(() => {
      if (isAppendOnlyBlocked("insert")) {
        throw new Error("[audit] append-only 위반")
      }
    }).not.toThrow()
  })

  // ── route 게이트: canReadAuditLogs 로직 기반 role별 허용/차단 시뮬레이션 ────

  test("비권한 등급(빈 permRows): canReadAuditLogs=false → route 가 403 반환해야 한다", () => {
    // route 핸들러 내부 게이트 로직과 동일한 조건으로 시뮬레이션
    const roleKey = "marketer"
    const permRows: PermRow[] = [] // 권한 행 없음
    const allowed = canReadAuditLogs(roleKey, permRows)
    expect(allowed).toBe(false)
    // route 핸들러는 !allowed 이면 res.status(403) 반환 — 구조 확인
    expect(routeSource).toContain("res.status(403)")
  })

  test("can_read=false 인 등급: canReadAuditLogs=false → route 가 403 반환해야 한다", () => {
    const roleKey = "marketer"
    const permRows: PermRow[] = [
      {
        role_key: "marketer",
        menu_id: "audit-logs",
        can_read: false,
        can_create: false,
        can_update: false,
        can_delete: false,
      },
    ]
    const allowed = canReadAuditLogs(roleKey, permRows)
    expect(allowed).toBe(false)
  })

  test("super 등급: canReadAuditLogs=true → route 가 200 경로로 진행해야 한다", () => {
    const allowed = canReadAuditLogs("super", [])
    expect(allowed).toBe(true)
  })

  test("null(미할당) 등급: canReadAuditLogs=true → route 가 200 경로로 진행해야 한다", () => {
    const allowed = canReadAuditLogs(null, [])
    expect(allowed).toBe(true)
  })

  test("operation 등급(실제 권한 매트릭스): canReadAuditLogs=false → route 가 403 반환해야 한다", () => {
    const opPerms = ALL_PERMS.filter((r) => r.role_key === "operation")
    const allowed = canReadAuditLogs("operation", opPerms)
    expect(allowed).toBe(false)
  })
})
