/**
 * 동의 이력 모듈 단위 테스트 (d5 t008 — production 직접 검증)
 */
import {
  getLatestConsent,
  isConsented,
  isReconsentDue,
  channelsNeedingReconsent,
  RECONSENT_YEARS,
  type ConsentRecord,
} from "../logic"

import * as fs from "fs"
import * as path from "path"

const RECORDS: ConsentRecord[] = [
  { channel: "marketing", agreed: true, recordedAt: "2024-01-01T00:00:00.000Z" },
  { channel: "marketing", agreed: false, recordedAt: "2024-06-01T00:00:00.000Z" }, // 철회(최신)
  { channel: "terms", agreed: true, recordedAt: "2023-01-01T00:00:00.000Z" },
]

describe("getLatestConsent / isConsented: 최신 기록 우선", () => {
  test("marketing 최신은 철회(agreed=false)", () => {
    expect(getLatestConsent(RECORDS, "marketing")?.agreed).toBe(false)
    expect(isConsented(RECORDS, "marketing")).toBe(false)
  })
  test("terms 는 동의 상태", () => {
    expect(isConsented(RECORDS, "terms")).toBe(true)
  })
  test("기록 없는 채널은 false", () => {
    expect(isConsented(RECORDS, "sms")).toBe(false)
  })
})

describe("isReconsentDue: 2년 재확인", () => {
  test("RECONSENT_YEARS=2", () => {
    expect(RECONSENT_YEARS).toBe(2)
  })
  test("2년 경과 시 due=true", () => {
    expect(isReconsentDue("2023-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(true)
  })
  test("2년 미경과 시 due=false", () => {
    expect(isReconsentDue("2025-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(false)
  })
  test("정확히 2년 경계는 due=true", () => {
    expect(isReconsentDue("2024-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z")).toBe(true)
  })
})

describe("channelsNeedingReconsent: 동의 중 2년 경과 채널", () => {
  test("terms(2023 동의)는 2026 기준 재확인 필요, marketing(철회)은 제외", () => {
    const due = channelsNeedingReconsent(
      RECORDS,
      ["marketing", "terms", "privacy"],
      "2026-01-01T00:00:00.000Z"
    )
    expect(due).toContain("terms")
    expect(due).not.toContain("marketing") // 최신이 철회라 제외
    expect(due).not.toContain("privacy") // 기록 없음
  })
})

describe("service.ts / route.ts 구조 검증", () => {
  const svc = fs.readFileSync(path.resolve(__dirname, "../service.ts"), "utf-8")
  const route = fs.readFileSync(
    path.resolve(__dirname, "../../../api/admin/consents/customers/[id]/route.ts"),
    "utf-8"
  )
  test("service 가 logic 룰 import(isConsented/channelsNeedingReconsent)", () => {
    expect(svc).toContain("isConsented")
    expect(svc).toContain("channelsNeedingReconsent")
    expect(svc).toContain("./logic")
  })
  test("recordConsent/getStatus 메서드 존재", () => {
    expect(svc).toContain("recordConsent")
    expect(svc).toContain("getStatus")
  })
  test("route 가 channel 검증(400) + GET/POST export", () => {
    expect(route).toContain("export async function GET")
    expect(route).toContain("export async function POST")
    expect(route).toContain("400")
  })
})
