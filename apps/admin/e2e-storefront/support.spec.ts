import { test, expect } from "@playwright/test"
test("고객센터 1:1 문의 제출", async ({ page }) => {
  test.setTimeout(60000)
  await page.goto("/kr/customer-service", { waitUntil: "networkidle" })
  await page.getByTestId("open-support-form").click({ timeout: 10000 })
  await page.getByTestId("support-email").fill("e2e-support@kr-demo.local")
  await page.getByTestId("support-subject").fill("E2E 1:1 문의")
  await page.getByTestId("support-content").fill("자동화로 작성한 1:1 문의 내용입니다.")
  await page.getByTestId("submit-support").click()
  await expect(page.getByTestId("support-done")).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: "test-results/storefront/support_inquiry.png", fullPage: true }).catch(()=>{})
})
