/** 스토어프론트 네비게이션·검색·정렬·상품진입 — 클릭 단위 검증 */
import { test, expect, Page } from "@playwright/test"

const errs: string[] = []
async function gotoHome(page: Page) {
  await page.goto("/kr", { waitUntil: "networkidle" })
  const close = page.getByTestId("popup-close")
  if (await close.count()) await close.click().catch(() => {})
}

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (e) => errs.push("pageerror:" + e.message))
})

test("GNB 메뉴 버튼 → 카테고리 이동", async ({ page }) => {
  test.setTimeout(60000)
  await gotoHome(page)
  await page.getByTestId("nav-menu-button").click()
  await expect(page.getByTestId("nav-menu-popup")).toBeVisible({ timeout: 10000 })
  const cat = page.getByTestId("category-link").first()
  await expect(cat).toBeVisible()
  await cat.click()
  await expect(page).toHaveURL(/\/(categories|store|collections)/, { timeout: 15000 })
})

test("검색 → 결과 페이지", async ({ page }) => {
  test.setTimeout(60000)
  await gotoHome(page)
  await page.getByTestId("search-input").fill("shirt")
  await page.getByTestId("search-input").press("Enter")
  await page.waitForURL("**/store**", { timeout: 15000 })
  await expect(page.locator('[data-testid="product-wrapper"]').first()).toBeVisible({ timeout: 15000 })
})

test("nav 링크: 스토어/계정/장바구니", async ({ page }) => {
  test.setTimeout(60000)
  await gotoHome(page)
  // nav-store-link = 로고(홈) 링크
  await page.getByTestId("nav-store-link").first().click()
  await expect(page).toHaveURL(/\/kr\/?$/, { timeout: 15000 })
  await page.getByTestId("nav-cart-link").first().click()
  await expect(page).toHaveURL(/\/cart/, { timeout: 15000 })
  await gotoHome(page)
  await page.getByTestId("nav-account-link").first().click()
  await expect(page).toHaveURL(/\/account/, { timeout: 15000 })
})

test("스토어 정렬 변경 + 상품 클릭 → 상세", async ({ page }) => {
  test.setTimeout(60000)
  await page.goto("/kr/store", { waitUntil: "networkidle" })
  await expect(page.locator('[data-testid="product-wrapper"]').first()).toBeVisible({ timeout: 15000 })
  // 정렬(가격 오름차순) 적용 — refinement
  const priceSort = page.getByRole("radio", { name: /가격|낮은|price/i }).first()
  if (await priceSort.count()) await priceSort.click().catch(() => {})
  // 상품 클릭 → PDP
  await page.getByTestId("product-wrapper").first().click()
  await expect(page).toHaveURL(/\/products\//, { timeout: 15000 })
  await expect(page.getByTestId("product-container")).toBeVisible({ timeout: 15000 })
})

test("footer 고객센터 이동", async ({ page }) => {
  test.setTimeout(60000)
  await gotoHome(page)
  const cs = page.getByRole("link", { name: "고객센터" }).first()
  if (await cs.count()) { await cs.click(); await expect(page).toHaveURL(/customer-service/, { timeout: 15000 }) }
})

test.afterAll(() => { console.log("pageerror 총:", errs.length, errs.slice(0,3).join(" | ")) })
