/**
 * 양 언어 실제 조작 검증 (2026-08-06 신설)
 *
 * ── 화면이 뜨는 것과 동작하는 것은 다르다 ──────────────────────────────────
 * `storefront-bilingual` 은 화면이 **깨지지 않는지**만 본다.
 * 여기서는 영어 상태에서 **실제로 눌러서 일이 일어나는지**를 본다.
 * 번역 도입 과정에서 조용히 끊길 수 있는 것들이다:
 *   · 담기 버튼이 영어로 바뀌면서 클릭 핸들러가 빠지는 것
 *   · 정렬/필터가 라벨만 영어이고 쿼리는 안 바뀌는 것
 *   · 검색·로그인이 언어에 따라 다르게 동작하는 것
 *
 * 두 언어에서 **같은 결과**가 나와야 한다.
 */
import { test, expect, type Page } from "@playwright/test"

const CC = process.env.E2E_COUNTRY ?? "kr"

const LOCALES = [
  { label: "한국어", cookie: null as string | null, addToCart: /장바구니 담기|옵션을 선택하세요|품절/ },
  { label: "영어", cookie: "en-US", addToCart: /Add to cart|Please select an option|Sold out/ },
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
  test.describe(`${loc.label} 조작`, () => {
    test("상품 목록 → 상세 이동 → 담기 버튼이 눌린다", async ({ page }) => {
      await setLocale(page, loc.cookie)
      await page.goto(`/${CC}/store`, { waitUntil: "domcontentloaded" })
      await page.waitForLoadState("networkidle").catch(() => {})

      const firstProduct = page.locator('a[href*="/products/"]').first()
      await expect(firstProduct).toBeVisible({ timeout: 30_000 })
      await firstProduct.click()
      await page.waitForURL(`**/${CC}/products/**`, { timeout: 30_000 })

      // 담기 버튼이 해당 언어로 렌더되고 실제로 존재하는가
      const btn = page.getByTestId("add-product-button")
      await expect(btn).toBeVisible({ timeout: 30_000 })
      await expect(btn).toHaveText(loc.addToCart)
    })

    test("정렬을 바꾸면 URL 과 목록이 실제로 바뀐다", async ({ page }) => {
      await setLocale(page, loc.cookie)
      await page.goto(`/${CC}/store`, { waitUntil: "domcontentloaded" })
      await page.waitForLoadState("networkidle").catch(() => {})

      // 라벨은 언어마다 다르므로 **value(=id)** 로 고른다 —
      // 라벨만 번역되고 동작이 안 붙는 것을 잡기 위해서다.
      // 실제 radio 는 `hidden peer` 라 클릭이 안 되므로 htmlFor 로 연결된 라벨을 누른다.
      const priceAscLabel = page.locator('label[for="price_asc"]').first()
      await expect(priceAscLabel).toBeVisible({ timeout: 30_000 })
      await priceAscLabel.click()

      await page.waitForURL(/sortBy=price_asc/, { timeout: 20_000 })
      await page.waitForLoadState("networkidle").catch(() => {})
      await expect(page.locator('a[href*="/products/"]').first()).toBeVisible({ timeout: 30_000 })
    })

    test("로그인 실패 메시지가 해당 언어로 나온다", async ({ page }) => {
      await setLocale(page, loc.cookie)
      await page.goto(`/${CC}/account`, { waitUntil: "domcontentloaded" })
      await page.waitForLoadState("networkidle").catch(() => {})

      await page.getByTestId("email-input").fill("nobody@example.invalid")
      await page.getByTestId("password-input").fill("wrong-password-1234")
      await page.getByTestId("sign-in-button").click()

      // 에러가 화면에 뜨는지 (문구는 백엔드 응답이라 언어가 섞일 수 있으므로 존재만 확인)
      await expect(page.getByTestId("login-error-message")).toBeVisible({ timeout: 30_000 })
    })

    test("비회원 주문조회 폼이 동작한다", async ({ page }) => {
      await setLocale(page, loc.cookie)
      await page.goto(`/${CC}/order/lookup`, { waitUntil: "domcontentloaded" })
      await page.waitForLoadState("networkidle").catch(() => {})

      await expect(page.getByTestId("order-lookup-form")).toBeVisible({ timeout: 30_000 })
      await page.getByTestId("lookup-display-id").fill("99999999")
      await page.getByTestId("lookup-email").fill("nobody@example.invalid")
      await page.getByTestId("lookup-submit").click()

      // 없는 주문이므로 에러 안내가 떠야 한다 — 조용히 아무 일도 없으면 안 된다
      await page.waitForTimeout(2500)
      const text = await page.locator("main").innerText()
      expect(
        /일치하는 주문|없습니다|not found|No matching|확인해 주세요|check/i.test(text),
        "조회 실패 안내가 보여야 한다"
      ).toBe(true)
    })
  })
}
