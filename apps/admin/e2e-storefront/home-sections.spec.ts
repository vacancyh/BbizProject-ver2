import { test, expect } from "@playwright/test"
test("홈: MD추천 + 신상품 섹션 노출", async ({ page }) => {
  test.setTimeout(60000)
  await page.goto("/kr", { waitUntil: "networkidle" })
  // 팝업 닫기
  const close = page.getByTestId("popup-close")
  if (await close.count()) await close.click().catch(()=>{})
  await expect(page.getByTestId("home-curation")).toBeVisible({ timeout: 15000 })
  await expect(page.getByText("MD 추천").first()).toBeVisible()
  await expect(page.getByTestId("new-arrivals")).toBeVisible({ timeout: 10000 })
  await expect(page.getByText("신상품").first()).toBeVisible()
  await page.screenshot({ path: "test-results/storefront/home_sections.png", fullPage: true }).catch(()=>{})
})
