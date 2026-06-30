import { test, expect } from "@playwright/test"
test("계정 배송지 추가 모달에 우편번호 검색 버튼 노출", async ({ page }) => {
  test.setTimeout(90000)
  // 로그인
  await page.goto("/kr/account", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("login-page")).toBeVisible({ timeout: 15000 })
  await page.getByTestId("email-input").fill("qa-points@kr-demo.local")
  await page.getByTestId("password-input").fill("qa1234!")
  await page.getByTestId("sign-in-button").click()
  await expect(page.getByTestId("welcome-message")).toBeVisible({ timeout: 20000 })
  // 배송지 페이지 → 새 배송지
  await page.goto("/kr/account/addresses", { waitUntil: "networkidle" })
  await page.getByTestId("add-address-button").click({ timeout: 10000 })
  await expect(page.getByTestId("postcode-search-button")).toBeVisible({ timeout: 10000 })
  await page.screenshot({ path: "test-results/storefront/postcode_addr.png" }).catch(()=>{})
})
