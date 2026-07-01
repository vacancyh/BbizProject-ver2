import { test, expect } from "@playwright/test"
test("검색 제안: 인기검색어 노출 + 최근검색어 기록", async ({ page }) => {
  test.setTimeout(90000)
  // 스토어 진입 → 인기 검색어 칩 노출
  await page.goto("/kr/store", { waitUntil: "networkidle" })
  await expect(page.getByTestId("search-suggestions")).toBeVisible({ timeout: 15000 })
  await expect(page.getByText("인기 검색어")).toBeVisible()
  const chip = page.getByTestId("search-chip").first()
  await expect(chip).toBeVisible()
  // 인기검색어 칩 클릭 → 검색 결과
  await chip.click()
  await page.waitForURL("**/store?q=**", { timeout: 15000 })
  // 최근 검색어에 기록됨
  await expect(page.getByText("최근 검색어")).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: "test-results/storefront/search_suggest.png" }).catch(()=>{})
})
