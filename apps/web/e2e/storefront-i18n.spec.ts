/**
 * 다국어 화면 검증 (2026-08-05 신설)
 *
 * 이 테스트가 막는 것
 *  · 언어를 바꿔도 화면 문구가 안 바뀌는 것(전환이 조용히 끊김)
 *  · 영어 화면에 **번역 키가 그대로 노출**되는 것 ("cart.checkout" 같은 게 버튼에 뜸)
 *  · 영어 화면에 한글이 남는 것(전환 누락)
 *
 * 전제
 *  · 백엔드 번역 모듈 활성화 + 스토어 지원 언어에 ko-KR/en-US 지정
 *    (backend: npx medusa exec ./src/scripts/setup-translation.ts)
 *
 * ⚠️ 언어는 `_medusa_locale` 쿠키로 정해진다. 콘텐츠 번역(상품명)과 **같은 스위치**다.
 */
import { test, expect, type Page } from "@playwright/test"

const CC = process.env.E2E_COUNTRY ?? "kr"

/** 이 언어로 화면을 연다. */
async function visit(page: Page, path: string, locale?: string) {
  if (locale) {
    await page.context().addCookies([
      { name: "_medusa_locale", value: locale, url: "http://localhost:8000" },
    ])
  } else {
    await page.context().clearCookies({ name: "_medusa_locale" })
  }
  await page.goto(path, { waitUntil: "domcontentloaded" })
  await page.waitForLoadState("networkidle").catch(() => {})
}

test.describe("다국어 화면", () => {
  test("장바구니: 한국어 ↔ 영어 전환", async ({ page }) => {
    await visit(page, `/${CC}/cart`)
    await expect(page.getByText("장바구니가 비어 있습니다")).toBeVisible({ timeout: 30_000 })

    await visit(page, `/${CC}/cart`, "en-US")
    await expect(page.getByText("Your cart is empty")).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText("Browse all products")).toBeVisible()
  })

  test("로그인 화면: 한국어 ↔ 영어 전환", async ({ page }) => {
    await visit(page, `/${CC}/account`)
    await expect(page.getByText("다시 오신 것을 환영합니다")).toBeVisible({ timeout: 30_000 })

    await visit(page, `/${CC}/account`, "en-US")
    await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 30_000 })
  })

  test("헤더는 모든 화면에서 함께 바뀐다", async ({ page }) => {
    await visit(page, `/${CC}`, "en-US")
    await expect(page.getByTestId("nav-account-link")).toContainText("My account")
    await expect(page.getByTestId("nav-cart-link")).toContainText("Cart")
  })

  test("영어 화면에 번역 키가 노출되지 않는다", async ({ page }) => {
    for (const path of [`/${CC}/cart`, `/${CC}/account`]) {
      await visit(page, path, "en-US")
      const body = await page.locator("body").innerText()
      // "cart.checkout" 처럼 점이 든 토큰 = 사전에 없는 키를 부른 것(그대로 화면에 나온다)
      const rawKeys = body.match(
        /\b(common|nav|store|product|cart|checkout|account|validation)\.[a-zA-Z.]+\b/g
      )
      expect(rawKeys, `${path} 에 번역 키 노출: ${rawKeys?.join(", ")}`).toBeNull()
    }
  })

  test("전환한 영역에는 한글이 남아 있지 않다", async ({ page }) => {
    // ⚠️ 화면 전체를 검사하면 안 된다. 두 종류가 섞여 있어 오탐이 난다:
    //   · 아직 전환하지 않은 UI 영역(사이드메뉴 등)
    //   · **운영자가 관리하는 콘텐츠**(카테고리명 "상의" 등) — 관리자에서 영어를 넣어야 바뀐다
    // 그래서 "전환을 끝낸 영역"만 지목해서 본다. 전환할 때마다 여기에 추가한다.
    const converted: { path: string; region: string }[] = [
      { path: `/${CC}/cart`, region: '[data-testid="empty-cart-message"]' },
      { path: `/${CC}/account`, region: '[data-testid="login-page"]' },
    ]

    for (const { path, region } of converted) {
      await visit(page, path, "en-US")
      const text = await page.locator(region).innerText()
      const hangul = text.match(/[가-힣]{2,}/g)
      expect(hangul, `${path} ${region} 에 한글 잔존: ${hangul?.slice(0, 5).join(", ")}`).toBeNull()
    }
  })

  test("모르는 언어는 기본(한국어)으로 떨어진다", async ({ page }) => {
    await visit(page, `/${CC}/cart`, "zz-ZZ")
    await expect(page.getByText("장바구니가 비어 있습니다")).toBeVisible({ timeout: 30_000 })
  })
})
