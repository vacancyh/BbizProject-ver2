import { test, expect } from "@playwright/test"
test("홈: hero 캐러셀 + 팝업 노출", async ({ page }) => {
  test.setTimeout(60000)
  await page.goto("/kr", { waitUntil: "networkidle" })
  // 팝업
  await expect(page.getByTestId("home-popup")).toBeVisible({ timeout: 15000 })
  await expect(page.getByText("신규 회원 적립금 500원 지급").first()).toBeVisible()
  await page.screenshot({ path: "test-results/storefront/banner_popup.png" }).catch(()=>{})
  // 팝업 닫기 → hero 캐러셀
  await page.getByTestId("popup-close").click()
  await expect(page.getByTestId("hero-carousel")).toBeVisible({ timeout: 10000 })
  await expect(page.getByText("신상품 입고 — 지금 만나보세요").first()).toBeVisible()
  await page.screenshot({ path: "test-results/storefront/banner_hero.png" }).catch(()=>{})
})
