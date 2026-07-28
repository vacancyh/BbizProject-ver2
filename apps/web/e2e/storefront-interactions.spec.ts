/**
 * 스토어프론트 클라이언트 상호작용/하이드레이션 검증 (2026-07-28 신규)
 * SSR 200 만으로는 잡히지 않는 것들: 클라이언트 라우팅, 옵션 선택 → 장바구니 담기,
 * 카트 반영, localStorage 기반 최근 본 상품, 홈 캐러셀/섹션 하이드레이션.
 */
import { test, expect } from "@playwright/test"

const CC = process.env.STOREFRONT_REGION ?? "kr"

test.describe.configure({ mode: "serial" })

test("홈: 하이드레이션 후 히어로 캐러셀·주요 섹션 렌더", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(e.message))

  await page.goto(`/${CC}`)
  await page.waitForLoadState("networkidle").catch(() => {})

  // 히어로 캐러셀은 클라이언트 컴포넌트 — 하이드레이션 실패 시 렌더되지 않음
  await expect(page.getByTestId("hero-carousel")).toBeVisible()
  // 베스트 상품 섹션(클라이언트 fetch)
  await expect(page.getByTestId("best-products")).toBeVisible()

  expect(pageErrors, `런타임 예외: ${pageErrors.join(" | ")}`).toHaveLength(0)
})

test("상품목록 → 상세: 클라이언트 라우팅으로 진입", async ({ page }) => {
  await page.goto(`/${CC}/store`)
  const firstProduct = page.locator('a[href*="/products/"]').first()
  await expect(firstProduct).toBeVisible()
  await firstProduct.click()

  await page.waitForURL(`**/${CC}/products/**`)
  // 연관상품 카드에도 product-title 이 있으므로 상세 컨테이너로 스코프
  await expect(page.getByTestId("product-container")).toBeVisible()
  await expect(
    page.getByTestId("product-container").getByTestId("product-title")
  ).toBeVisible()
})

test("상품상세: 옵션 선택 → 장바구니 담기 → 카트에 반영", async ({ page }) => {
  await page.goto(`/${CC}/store`)
  await page.locator('a[href*="/products/"]').first().click()
  await page.waitForURL(`**/${CC}/products/**`)

  // 옵션이 있는 상품이면 각 옵션의 첫 값을 선택(단일 variant 상품은 스킵)
  const optionGroups = page.getByTestId("product-options")
  if (await optionGroups.count()) {
    const groups = await optionGroups.all()
    for (const g of groups) {
      const btn = g.getByTestId("option-button").first()
      if (await btn.count()) await btn.click()
    }
  }

  const addBtn = page.getByTestId("add-product-button")
  await expect(addBtn).toBeVisible()
  await expect(addBtn).toBeEnabled({ timeout: 20_000 })
  await addBtn.click()

  // 담기 성공 시 카트 링크의 수량 표기가 증가(0 → 1 이상)
  const cartLink = page.getByTestId("nav-cart-link")
  await expect(cartLink).toContainText(/[1-9]/, { timeout: 30_000 })

  // 카트 페이지에서도 실제 라인아이템 확인(카트 라인 = product-row, 빈 카트 메시지 아님)
  await page.goto(`/${CC}/cart`)
  await expect(page.getByTestId("cart-container")).toBeVisible()
  await expect(page.getByTestId("product-row").first()).toBeVisible()
  await expect(page.getByTestId("empty-cart-message")).toHaveCount(0)
})

test("최근 본 상품: localStorage 반영", async ({ page }) => {
  await page.goto(`/${CC}/store`)
  await page.locator('a[href*="/products/"]').first().click()
  await page.waitForURL(`**/${CC}/products/**`)
  await page.waitForLoadState("networkidle").catch(() => {})

  const stored = await page.evaluate(() =>
    Object.keys(window.localStorage).filter((k) => /recent/i.test(k))
  )
  expect(stored.length, "최근 본 상품 localStorage 키 없음").toBeGreaterThan(0)

  // 최근 본 상품 섹션은 상품 상세 템플릿에 렌더되며 현재 상품은 제외 →
  // 두 번째 상품 상세로 이동하면 첫 상품이 노출돼야 한다.
  await page.goto(`/${CC}/store`)
  await page.locator('a[href*="/products/"]').nth(1).click()
  await page.waitForURL(`**/${CC}/products/**`)
  await expect(page.getByTestId("recently-viewed")).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId("recent-item").first()).toBeVisible()
})

test("계정: 로그인 폼 클라이언트 검증(잘못된 자격증명 → 에러 표시)", async ({ page }) => {
  await page.goto(`/${CC}/account`)
  await expect(page.getByTestId("login-page")).toBeVisible()
  // 제출 전에는 에러 영역이 비어 있어야 한다(오탐 방지)
  await expect(page.getByTestId("login-error-message")).toHaveCount(0)

  await page.getByTestId("email-input").fill("no-such-user@kr-e2e.local")
  await page.getByTestId("password-input").fill("wrong-password-1234")
  await page.getByTestId("sign-in-button").click()

  // 서버 액션 응답 후 에러 메시지가 클라이언트에 렌더돼야 함(무한 로딩/무반응 아님)
  await expect(page.getByTestId("login-error-message")).toBeVisible({ timeout: 30_000 })
})
