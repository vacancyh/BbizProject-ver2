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
 * ⚠️ 언어는 **주소**가 정한다 — `/kr` 은 한국어, `/en/kr` 은 영어(2026-08-12 변경).
 *    쿠키를 심어도 `/kr/...` 은 한국어로 나온다. 그래야 링크가 공유 가능하고
 *    검색엔진이 영어판을 볼 수 있다(쿠키가 없는 크롤러는 영어를 영영 못 봤다).
 */
import { test, expect, type Page } from "@playwright/test"

import { localized, type TestLocale } from "./_locale"

const CC = process.env.E2E_COUNTRY ?? "kr"

/** 이 언어로 화면을 연다 — 언어는 **주소**로 지정한다. */
async function visit(page: Page, path: string, locale?: TestLocale) {
  await page.goto(localized(path, locale), { waitUntil: "domcontentloaded" })
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
    // 2026-08-11: UI 라벨 전환을 끝내고 화면 단위로 넓혔다.
    // 여전히 **화면 전체**를 검사하지는 않는다 — 아래는 언어와 무관하게 한글이 정상인 것들이다:
    //   · 고객이 입력한 값(이름·주소·리뷰 본문)
    //   · 상품정보고시 값(전자상거래법 고시 — 한국어 원문이 기준)
    //   · 실제 고객이 검색한 인기 검색어
    const converted: { path: string; region: string }[] = [
      { path: `/${CC}`, region: "header" },
      { path: `/${CC}`, region: "footer" },
      { path: `/${CC}/cart`, region: '[data-testid="empty-cart-message"]' },
      { path: `/${CC}/account`, region: '[data-testid="login-page"]' },
      { path: `/${CC}/store`, region: '[data-testid="store-page-title"]' },
      { path: `/${CC}/wishlist`, region: '[data-testid="wishlist-page-wrapper"]' },
      { path: `/${CC}/order/lookup`, region: '[data-testid="order-lookup-form"]' },
      { path: `/${CC}/customer-service`, region: '[data-testid="cs-faqs"]' },
    ]

    for (const { path, region } of converted) {
      await visit(page, path, "en-US")
      const text = await page.locator(region).innerText()
      const hangul = text.match(/[가-힣]{2,}/g)
      expect(hangul, `${path} ${region} 에 한글 잔존: ${hangul?.slice(0, 5).join(", ")}`).toBeNull()
    }
  })

  test("헤더 언어 전환기로 실제 전환된다 — 주소까지 바뀐다", async ({ page }) => {
    // 언어 선택은 사이드메뉴가 아니라 **헤더**에 있어야 한다(2026-08-10 이동).
    // 여기서는 고객이 하는 그대로 눌러서 바꾼다.
    //
    // ⚠️ 전환은 **전체 페이지 로드**다(2026-08-12). 클라이언트 이동으로는 루트 레이아웃이
    //    다시 안 그려져 `<html lang>` 과 버튼 문구가 이전 언어로 남는다.
    //    그래서 각 전환마다 주소가 실제로 바뀔 때까지 기다린다.
    await visit(page, `/${CC}/cart`)

    const btn = () => page.getByTestId("language-switcher-button")
    await expect(btn()).toBeVisible({ timeout: 30_000 })
    expect(await btn().evaluate((el) => !!el.closest("header")), "헤더 안에 있어야 한다").toBe(
      true
    )

    // 기본은 한국어
    await expect(btn()).toContainText("KO")
    await expect(page.getByText("장바구니가 비어 있습니다")).toBeVisible()

    // 영어로 전환 → 주소에 /en 이 붙어야 한다
    await btn().click()
    await page.getByTestId("language-option-en-US").click()
    await page.waitForURL(`**/en/${CC}/cart`, { timeout: 30_000 })
    await expect(page.getByText("Your cart is empty")).toBeVisible({ timeout: 30_000 })
    await expect(btn()).toContainText("EN")
    expect(await page.locator("html").getAttribute("lang")).toBe("en")

    // 다시 한국어로 → 접두사가 사라져야 한다
    await btn().click()
    await page.getByTestId("language-option-ko-KR").click()
    await page.waitForURL(`**/${CC}/cart`, { timeout: 30_000 })
    await expect(page.getByText("장바구니가 비어 있습니다")).toBeVisible({ timeout: 30_000 })
    expect(await page.locator("html").getAttribute("lang")).toBe("ko")
  })

  test("모르는 언어 쿠키가 남아 있어도 화면이 깨지지 않는다", async ({ page }) => {
    // 언어는 주소가 정하지만, 쿠키에 이상한 값이 남아 있을 수 있다
    // (구버전에서 넘어온 사용자, 손으로 건드린 경우).
    await page.context().addCookies([
      { name: "_medusa_locale", value: "zz-ZZ", url: "http://localhost:8000" },
    ])
    await visit(page, `/${CC}/cart`)
    await expect(page.getByText("장바구니가 비어 있습니다")).toBeVisible({ timeout: 30_000 })
  })

  test("주소가 언어를 정한다 — 쿠키보다 우선", async ({ page }) => {
    // 이게 깨지면 링크 공유가 다시 망가진다. 보내는 사람이 영어로 보고 있어도
    // 받는 사람은 자기 쿠키대로 열리기 때문이다.
    await page.context().addCookies([
      { name: "_medusa_locale", value: "en-US", url: "http://localhost:8000" },
    ])
    await visit(page, `/${CC}/cart`) // 접두사 없음 = 한국어
    await expect(page.getByText("장바구니가 비어 있습니다")).toBeVisible({ timeout: 30_000 })
    expect(await page.locator("html").getAttribute("lang")).toBe("ko")
  })

  test("쿠키 없는 방문자도 영어 주소를 볼 수 있다 — 검색엔진이 이 경로다", async ({ page }) => {
    await page.context().clearCookies({ name: "_medusa_locale" })
    await visit(page, `/${CC}/cart`, "en-US")
    expect(await page.locator("html").getAttribute("lang")).toBe("en")
    await expect(page.getByText("Your cart is empty")).toBeVisible({ timeout: 30_000 })
  })
})
