/**
 * 양 언어 전 화면 검증 (2026-08-06 신설)
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────────────
 * 기존 E2E 는 전부 **한국어 기준**이다. 영어로 열었을 때 화면이 깨지는지는
 * 아무도 확인한 적이 없었다. 특히 두 가지가 조용히 망가진다:
 *
 *  ① **레이아웃** — 영문은 한글보다 길어지는 문구가 많다
 *     ("장바구니에 담기" 7자 vs "Add to cart" 11자, "정렬" 2자 vs "Sort" 4자).
 *     좁은 버튼·모바일 뷰포트에서 넘치거나 잘린다.
 *  ② **런타임 에러** — 번역 경로에만 있는 버그(키 누락, undefined 접근)
 *
 * ── 무엇을 보나 ────────────────────────────────────────────────────────────
 *  · HTTP 200 · pageerror 0 · console error 0
 *  · 가로 스크롤 없음 (레이아웃 넘침의 가장 확실한 신호)
 *  · 본문이 비어 있지 않음
 *
 * 데스크톱과 모바일 두 뷰포트에서 각각 한국어·영어로 돈다.
 */
import { test, expect, type Page } from "@playwright/test"

const CC = process.env.E2E_COUNTRY ?? "kr"

/** 로그인 없이 볼 수 있는 화면. 동적 경로는 런타임에 채운다. */
const SCREENS: { label: string; path: string }[] = [
  { label: "홈", path: `/${CC}` },
  { label: "전체상품", path: `/${CC}/store` },
  { label: "장바구니", path: `/${CC}/cart` },
  { label: "계정(로그인)", path: `/${CC}/account` },
  { label: "고객센터", path: `/${CC}/customer-service` },
  { label: "비회원 주문조회", path: `/${CC}/order/lookup` },
  { label: "위시리스트", path: `/${CC}/wishlist` },
  { label: "비밀번호 재설정", path: `/${CC}/reset-password` },
  { label: "이용약관", path: `/${CC}/content/terms-of-use` },
  { label: "개인정보처리방침", path: `/${CC}/content/privacy-policy` },
]

const LOCALES: { label: string; cookie: string | null }[] = [
  { label: "한국어", cookie: null },
  { label: "영어", cookie: "en-US" },
]

async function setLocale(page: Page, cookie: string | null) {
  if (cookie) {
    await page.context().addCookies([
      { name: "_medusa_locale", value: cookie, url: "http://localhost:8000" },
    ])
  } else {
    await page.context().clearCookies({ name: "_medusa_locale" })
  }
}

for (const loc of LOCALES) {
  test.describe(`${loc.label} 화면`, () => {
    for (const s of SCREENS) {
      test(`${s.label} (${s.path})`, async ({ page }, testInfo) => {
        const pageErrors: string[] = []
        const consoleErrors: string[] = []
        page.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 160)))
        page.on("console", (m) => {
          if (m.type() === "error") consoleErrors.push(m.text().slice(0, 160))
        })

        await setLocale(page, loc.cookie)
        const res = await page.goto(s.path, { waitUntil: "domcontentloaded" })
        expect(res?.status(), `${s.path} HTTP`).toBe(200)
        await page.waitForLoadState("networkidle").catch(() => {})

        // 본문이 실제로 그려졌는가
        const text = await page.locator("body").innerText()
        expect(text.trim().length, `${s.path} 본문 길이`).toBeGreaterThan(100)

        // 런타임 에러 0
        expect(pageErrors, `${s.path} pageerror`).toEqual([])
        expect(consoleErrors, `${s.path} console error`).toEqual([])

        // 레이아웃 넘침 — 영문이 길어져 버튼/헤더가 밀리면 여기서 잡힌다.
        // 1px 오차는 브라우저 반올림이므로 허용한다.
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(
          scrollWidth - clientWidth,
          `${s.path} 가로 넘침 (scroll ${scrollWidth} > client ${clientWidth}) — ${testInfo.project.name}`
        ).toBeLessThanOrEqual(1)
      })
    }
  })
}
