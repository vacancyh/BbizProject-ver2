/**
 * 제재 모듈 단위 테스트 (d5 t006_제재블랙리스트 — production 직접 검증)
 */
import {
  SANCTION_LEVELS,
  sanctionDurationDays,
  getNextSanctionLevel,
  calcSanctionUntil,
  isSanctionActive,
  shouldBlockLogin,
} from "../logic"

import * as fs from "fs"
import * as path from "path"

describe("단계/기간", () => {
  test("SANCTION_LEVELS 순서", () => {
    expect(SANCTION_LEVELS).toEqual(["warn", "seven_days", "thirty_days", "permanent"])
  })
  test("단계별 기간(일)", () => {
    expect(sanctionDurationDays("warn")).toBe(0)
    expect(sanctionDurationDays("seven_days")).toBe(7)
    expect(sanctionDurationDays("thirty_days")).toBe(30)
    expect(sanctionDurationDays("permanent")).toBeNull()
  })
})

describe("getNextSanctionLevel: 단계 상승", () => {
  test("warn→7→30→영구", () => {
    expect(getNextSanctionLevel("warn")).toBe("seven_days")
    expect(getNextSanctionLevel("seven_days")).toBe("thirty_days")
    expect(getNextSanctionLevel("thirty_days")).toBe("permanent")
  })
  test("영구에서 더 안 올라감", () => {
    expect(getNextSanctionLevel("permanent")).toBe("permanent")
  })
})

describe("calcSanctionUntil: 만료일", () => {
  test("7일 제재 만료", () => {
    expect(calcSanctionUntil("seven_days", "2026-01-01T00:00:00.000Z")).toBe(
      "2026-01-08T00:00:00.000Z"
    )
  })
  test("영구는 null", () => {
    expect(calcSanctionUntil("permanent", "2026-01-01T00:00:00.000Z")).toBeNull()
  })
  test("경고는 시작=종료(기록)", () => {
    expect(calcSanctionUntil("warn", "2026-01-01T00:00:00.000Z")).toBe("2026-01-01T00:00:00.000Z")
  })
})

describe("isSanctionActive / shouldBlockLogin", () => {
  const start = "2026-01-01T00:00:00.000Z"
  const until7 = calcSanctionUntil("seven_days", start)!
  test("기간 내 활성, 차단", () => {
    expect(isSanctionActive("seven_days", until7, "2026-01-03T00:00:00.000Z")).toBe(true)
    expect(shouldBlockLogin("seven_days", until7, "2026-01-03T00:00:00.000Z")).toBe(true)
  })
  test("기간 후 비활성, 차단 해제", () => {
    expect(isSanctionActive("seven_days", until7, "2026-02-01T00:00:00.000Z")).toBe(false)
    expect(shouldBlockLogin("seven_days", until7, "2026-02-01T00:00:00.000Z")).toBe(false)
  })
  test("경고는 차단 아님", () => {
    expect(shouldBlockLogin("warn", start, "2026-01-01T00:00:00.000Z")).toBe(false)
  })
  test("영구는 항상 활성·차단", () => {
    expect(isSanctionActive("permanent", null, "2030-01-01T00:00:00.000Z")).toBe(true)
    expect(shouldBlockLogin("permanent", null, "2030-01-01T00:00:00.000Z")).toBe(true)
  })
})

describe("service.ts / route.ts 구조 검증", () => {
  const svc = fs.readFileSync(path.resolve(__dirname, "../service.ts"), "utf-8")
  const route = fs.readFileSync(
    path.resolve(__dirname, "../../../api/admin/sanctions/customers/[id]/route.ts"),
    "utf-8"
  )
  test("service 가 logic 룰 import(getNextSanctionLevel/shouldBlockLogin)", () => {
    expect(svc).toContain("getNextSanctionLevel")
    expect(svc).toContain("shouldBlockLogin")
    expect(svc).toContain("./logic")
  })
  test("applySanction/getCurrent/liftSanction 메서드 존재", () => {
    expect(svc).toContain("applySanction")
    expect(svc).toContain("getCurrent")
    expect(svc).toContain("liftSanction")
  })
  test("route 가 GET/POST/DELETE 핸들러 export", () => {
    expect(route).toContain("export async function GET")
    expect(route).toContain("export async function POST")
    expect(route).toContain("export async function DELETE")
  })
})
