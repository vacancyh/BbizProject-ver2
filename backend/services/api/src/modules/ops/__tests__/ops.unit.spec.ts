/**
 * ops 단위 테스트 — t009 §9 (production 모듈 직접 검증)
 *
 * UT-001: 점검모드 ON/OFF(scope) + 헬스 polling (unit_066 케이스)
 *
 *  A. 점검모드 scope 전환 검증
 *     - isValidScope: all/storefront/admin = true, 그 외 = false
 *     - isValidMaintenanceMessage: 0~200자 = true, 201자 = false
 *     - canToggleMaintenance: super = true, 그 외(operation/cs/marketer/null) = false
 *
 *  B. 헬스 polling 상태 판정 검증
 *     - resolveHealthStatus: db+redis 모두 up → overall up / httpCode 200
 *     - resolveHealthStatus: db down → overall down / httpCode 503
 *     - resolveHealthStatus: redis down → overall down / httpCode 503
 *     - resolveHealthStatus: 모두 down → overall down / httpCode 503
 *
 *  C. route/service 구조 검증 (소스 파일 텍스트 기반)
 *     - maintenance/route.ts: canToggleMaintenance import + 403 분기 포함
 *     - maintenance/route.ts: RBAC_MODULE import + getUserRole 호출
 *     - health/route.ts: checkHealth 호출 포함
 *     - service.ts: canToggleMaintenance / isValidScope / isValidMaintenanceMessage / resolveHealthStatus 호출
 *
 * 테스트 전략:
 *  - production ops/logic.ts 직접 import (복제본 없음)
 *  - DB·MedusaService 의존 없음 (순수 함수만 검증)
 *  - route/service 소스는 fs.readFileSync 로 로드하여 구조 확인
 */

// ─── production 모듈 직접 import ──────────────────────────────────────────────
import {
  isValidScope,
  isValidMaintenanceMessage,
  resolveHealthStatus,
  canToggleMaintenance,
  MAINTENANCE_SCOPES,
  MAINTENANCE_MESSAGE_MAX,
} from "../logic"

import * as fs from "fs"
import * as path from "path"

// ─── UT-001-A — 점검모드 scope 전환 검증 ─────────────────────────────────────

describe("UT-001-A: 점검모드 scope 전환 검증", () => {
  // --- isValidScope ---

  test("scope 'all' 은 허용된 점검 범위이다(true)", () => {
    expect(isValidScope("all")).toBe(true)
  })

  test("scope 'storefront' 는 허용된 점검 범위이다(true)", () => {
    expect(isValidScope("storefront")).toBe(true)
  })

  test("scope 'admin' 은 허용된 점검 범위이다(true)", () => {
    expect(isValidScope("admin")).toBe(true)
  })

  test("scope 'ALL' (대문자) 은 허용되지 않는다(false)", () => {
    // MAINTENANCE_SCOPES 는 소문자 고정 — 대소문자 엄격 판정
    expect(isValidScope("ALL")).toBe(false)
  })

  test("scope 'shop' 은 허용되지 않는 범위이다(false)", () => {
    expect(isValidScope("shop")).toBe(false)
  })

  test("빈 문자열 scope 는 허용되지 않는다(false)", () => {
    expect(isValidScope("")).toBe(false)
  })

  test("MAINTENANCE_SCOPES 에 정의된 모든 값이 isValidScope=true 이다", () => {
    for (const s of MAINTENANCE_SCOPES) {
      expect(isValidScope(s)).toBe(true)
    }
  })

  // --- isValidMaintenanceMessage ---

  test("undefined 메시지는 검증 통과(선택 입력)(true)", () => {
    expect(isValidMaintenanceMessage(undefined)).toBe(true)
  })

  test("빈 문자열 메시지는 검증 통과(true)", () => {
    expect(isValidMaintenanceMessage("")).toBe(true)
  })

  test("200자 이내 메시지는 검증 통과(true)", () => {
    const msg = "점검 중입니다.".padEnd(100, " ")
    expect(isValidMaintenanceMessage(msg)).toBe(true)
  })

  test("정확히 200자 메시지는 검증 통과(true)", () => {
    const msg = "A".repeat(MAINTENANCE_MESSAGE_MAX)
    expect(msg.length).toBe(200)
    expect(isValidMaintenanceMessage(msg)).toBe(true)
  })

  test("201자 메시지는 검증 실패(false) — 길이 초과", () => {
    const msg = "A".repeat(MAINTENANCE_MESSAGE_MAX + 1)
    expect(msg.length).toBe(201)
    expect(isValidMaintenanceMessage(msg)).toBe(false)
  })

  test("500자 메시지는 검증 실패(false)", () => {
    const msg = "X".repeat(500)
    expect(isValidMaintenanceMessage(msg)).toBe(false)
  })

  // --- canToggleMaintenance ---

  test("super 등급만 점검모드 전환이 허용된다(true)", () => {
    expect(canToggleMaintenance("super")).toBe(true)
  })

  test("operation 등급은 점검모드 전환이 차단된다(false)", () => {
    expect(canToggleMaintenance("operation")).toBe(false)
  })

  test("cs 등급은 점검모드 전환이 차단된다(false)", () => {
    expect(canToggleMaintenance("cs")).toBe(false)
  })

  test("marketer 등급은 점검모드 전환이 차단된다(false)", () => {
    expect(canToggleMaintenance("marketer")).toBe(false)
  })

  test("null(미할당) 등급은 점검모드 전환이 차단된다(false)", () => {
    expect(canToggleMaintenance(null)).toBe(false)
  })

  test("빈 문자열 roleKey 는 점검모드 전환이 차단된다(false)", () => {
    expect(canToggleMaintenance("")).toBe(false)
  })
})

// ─── UT-001-B — 헬스 polling 상태 판정 검증 ──────────────────────────────────

describe("UT-001-B: 헬스 polling 상태 판정 검증", () => {
  test("DB·Redis 모두 up → overall 'up' / httpCode 200", () => {
    const result = resolveHealthStatus(true, true)
    expect(result.db).toBe("up")
    expect(result.redis).toBe("up")
    expect(result.overall).toBe("up")
    expect(result.httpCode).toBe(200)
  })

  test("DB down / Redis up → overall 'down' / httpCode 503", () => {
    const result = resolveHealthStatus(false, true)
    expect(result.db).toBe("down")
    expect(result.redis).toBe("up")
    expect(result.overall).toBe("down")
    expect(result.httpCode).toBe(503)
  })

  test("DB up / Redis down → overall 'down' / httpCode 503", () => {
    const result = resolveHealthStatus(true, false)
    expect(result.db).toBe("up")
    expect(result.redis).toBe("down")
    expect(result.overall).toBe("down")
    expect(result.httpCode).toBe(503)
  })

  test("DB·Redis 모두 down → overall 'down' / httpCode 503", () => {
    const result = resolveHealthStatus(false, false)
    expect(result.db).toBe("down")
    expect(result.redis).toBe("down")
    expect(result.overall).toBe("down")
    expect(result.httpCode).toBe(503)
  })

  test("반환 객체는 db/redis/overall/httpCode 필드를 모두 포함한다", () => {
    const result = resolveHealthStatus(true, true)
    expect(result).toHaveProperty("db")
    expect(result).toHaveProperty("redis")
    expect(result).toHaveProperty("overall")
    expect(result).toHaveProperty("httpCode")
  })
})

// ─── UT-001-C — route/service 구조 검증 ──────────────────────────────────────

describe("UT-001-C: route/service 구조 검증 (production 연결 확인)", () => {
  const baseDir = path.resolve(__dirname, "../../..")

  // maintenance/route.ts 소스 로드
  const maintenanceRoutePath = path.resolve(
    baseDir,
    "api/admin/ops/maintenance/route.ts"
  )
  const maintenanceRouteSource = fs.readFileSync(maintenanceRoutePath, "utf-8")

  // health/route.ts 소스 로드
  const healthRoutePath = path.resolve(
    baseDir,
    "api/admin/ops/health/route.ts"
  )
  const healthRouteSource = fs.readFileSync(healthRoutePath, "utf-8")

  // service.ts 소스 로드
  const servicePath = path.resolve(__dirname, "../service.ts")
  const serviceSource = fs.readFileSync(servicePath, "utf-8")

  // ── maintenance/route.ts 구조 검증 ───────────────────────────────────────

  test("maintenance/route.ts 가 canToggleMaintenance 를 ops/logic 에서 import 한다", () => {
    expect(maintenanceRouteSource).toContain("canToggleMaintenance")
    expect(maintenanceRouteSource).toContain("ops/logic")
  })

  test("maintenance/route.ts 가 RBAC_MODULE 을 import 하여 getUserRole 을 호출한다", () => {
    expect(maintenanceRouteSource).toContain("RBAC_MODULE")
    expect(maintenanceRouteSource).toContain("getUserRole")
  })

  test("maintenance/route.ts 가 403 응답을 반환하는 분기를 포함한다", () => {
    expect(maintenanceRouteSource).toContain("403")
    expect(maintenanceRouteSource).toContain("canToggleMaintenance(")
  })

  test("maintenance/route.ts 에서 canToggleMaintenance=false 이면 403 반환 로직이 연결된다", () => {
    const gateIdx = maintenanceRouteSource.indexOf("canToggleMaintenance(")
    const idx403 = maintenanceRouteSource.indexOf("403")
    expect(gateIdx).toBeGreaterThan(-1)
    expect(idx403).toBeGreaterThan(-1)
    // 403 이 canToggleMaintenance 호출 이후 1500자 이내에 위치
    expect(idx403 - gateIdx).toBeLessThan(1500)
    expect(idx403 - gateIdx).toBeGreaterThan(-200)
  })

  test("maintenance/route.ts 가 OPS_MODULE 을 import 하여 toggleMaintenance 를 호출한다", () => {
    expect(maintenanceRouteSource).toContain("OPS_MODULE")
    expect(maintenanceRouteSource).toContain("toggleMaintenance")
  })

  // ── health/route.ts 구조 검증 ─────────────────────────────────────────────

  test("health/route.ts 가 OPS_MODULE 을 import 한다", () => {
    expect(healthRouteSource).toContain("OPS_MODULE")
  })

  test("health/route.ts 가 checkHealth 를 호출한다", () => {
    expect(healthRouteSource).toContain("checkHealth")
  })

  test("health/route.ts 가 200/503 httpCode 기반 응답을 반환한다", () => {
    expect(healthRouteSource).toContain("httpCode")
    expect(healthRouteSource).toContain("status(status.httpCode)")
  })

  // ── service.ts 구조 검증 ─────────────────────────────────────────────────

  test("service.ts 가 canToggleMaintenance 를 ./logic 에서 import 한다", () => {
    expect(serviceSource).toContain("canToggleMaintenance")
    expect(serviceSource).toContain("./logic")
  })

  test("service.ts 가 isValidScope 를 ./logic 에서 import 한다", () => {
    expect(serviceSource).toContain("isValidScope")
  })

  test("service.ts 가 isValidMaintenanceMessage 를 ./logic 에서 import 한다", () => {
    expect(serviceSource).toContain("isValidMaintenanceMessage")
  })

  test("service.ts 가 resolveHealthStatus 를 ./logic 에서 import 한다", () => {
    expect(serviceSource).toContain("resolveHealthStatus")
  })

  test("service.ts 에 toggleMaintenance 메서드가 존재하고 canToggleMaintenance 를 호출한다", () => {
    expect(serviceSource).toContain("toggleMaintenance(")
    expect(serviceSource).toContain("canToggleMaintenance(roleKey)")
  })

  test("service.ts 에 checkHealth 메서드가 존재하고 resolveHealthStatus 를 호출한다", () => {
    expect(serviceSource).toContain("checkHealth(")
    expect(serviceSource).toContain("resolveHealthStatus(dbOk, redisOk)")
  })

  // ── canToggleMaintenance logic 기반 route 게이트 시뮬레이션 ─────────────

  test("super 등급: canToggleMaintenance=true → route 가 200 경로로 진행해야 한다", () => {
    expect(canToggleMaintenance("super")).toBe(true)
    // route 소스에 POST 핸들러가 존재하는지 확인
    expect(maintenanceRouteSource).toContain("POST(")
  })

  test("non-super 등급: canToggleMaintenance=false → route 가 403 반환해야 한다", () => {
    expect(canToggleMaintenance("operation")).toBe(false)
    expect(canToggleMaintenance("cs")).toBe(false)
    expect(canToggleMaintenance("marketer")).toBe(false)
    // route 소스에 403 반환 로직 존재 확인
    expect(maintenanceRouteSource).toContain("res.status(403)")
  })

  test("null 등급: canToggleMaintenance=false → route 가 403 반환해야 한다", () => {
    expect(canToggleMaintenance(null)).toBe(false)
    expect(maintenanceRouteSource).toContain("res.status(403)")
  })
})
