/**
 * UI 문구 사전 테스트 (2026-08-05)
 *
 * 이 테스트가 막는 것:
 *  · 한국어에만 키를 추가하고 영어를 빠뜨리는 것 (영어 화면에 키가 그대로 노출됨)
 *  · 자리표시자({count} 등)가 한쪽에만 있어 값이 안 채워지는 것
 *  · 번역을 빈 문자열로 두어 버튼이 사라지는 것
 */
import { describe, expect, it } from "vitest"

import { en, interpolate, ko, toUiLocale, UI_LOCALES } from "./messages"


const koKeys = Object.keys(ko) as (keyof typeof ko)[]

describe("메시지 사전", () => {
  it("한국어와 영어의 키가 정확히 같다", () => {
    expect(Object.keys(en).sort()).toEqual(koKeys.slice().sort())
  })

  it("빈 문구가 없다 — 비면 버튼·라벨이 사라진다", () => {
    for (const k of koKeys) {
      expect(ko[k].trim(), `ko.${k}`).not.toBe("")
      expect(en[k].trim(), `en.${k}`).not.toBe("")
    }
  })

  it("자리표시자가 두 언어에서 같다", () => {
    const holders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort()
    for (const k of koKeys) {
      expect(holders(en[k]), `${k} 의 자리표시자`).toEqual(holders(ko[k]))
    }
  })

  it("영어 문구에 한글이 섞여 있지 않다 — 번역 누락 흔적", () => {
    for (const k of koKeys) {
      expect(/[가-힣]/.test(en[k]), `en.${k} 에 한글이 있다: ${en[k]}`).toBe(false)
    }
  })
})

describe("toUiLocale", () => {
  it.each([
    ["ko-KR", "ko"],
    ["en-US", "en"],
    ["en-GB", "en"],
    ["EN_us", "en"],
  ])("%s → %s", (input, expected) => {
    expect(toUiLocale(input)).toBe(expected)
  })

  it.each([null, undefined, "", "ja-JP", "zzz"])(
    "모르는 값(%s)은 기본 한국어",
    (input) => {
      expect(toUiLocale(input as string | null)).toBe("ko")
    }
  )
})

describe("interpolate", () => {
  it("값을 채운다", () => {
    expect(interpolate("총 {count}개", { count: 12 })).toBe("총 12개")
  })

  it("값이 없으면 자리표시자를 그대로 둔다 — 조용히 빈칸이 되지 않게", () => {
    expect(interpolate("총 {count}개", {})).toBe("총 {count}개")
    expect(interpolate("총 {count}개")).toBe("총 {count}개")
  })

  it("여러 개를 채운다", () => {
    expect(interpolate("{a}/{b}", { a: 1, b: 2 })).toBe("1/2")
  })
})

describe("지원 언어", () => {
  it("ko·en 두 벌이 등록돼 있다", () => {
    expect(Object.keys(UI_LOCALES).sort()).toEqual(["en", "ko"])
  })
})
