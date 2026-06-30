import { test, expect } from "@playwright/test"

test("최근 본 상품: 다른 상품 방문 후 노출", async ({ page }) => {
  test.setTimeout(90000)
  await page.goto("/kr/products/t-shirt", { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)
  await page.goto("/kr/products/sweatshirt", { waitUntil: "networkidle" })
  // sweatshirt 페이지에서 최근 본 상품(t-shirt) 노출
  const rv = page.getByTestId("recently-viewed")
  await expect(rv).toBeVisible({ timeout: 15000 })
  await expect(rv.getByTestId("recent-item").first()).toBeVisible()
  await page.screenshot({ path: "test-results/storefront/recently_viewed.png", fullPage: true }).catch(()=>{})
})

test("무료배송 임계 안내: 장바구니 노출", async ({ page }) => {
  test.setTimeout(120000)
  await page.goto("/kr/products/t-shirt", { waitUntil: "networkidle" })
  const groups = page.getByTestId("product-options")
  const gc = await groups.count()
  for (let i = 0; i < gc; i++) {
    await groups.nth(i).getByTestId("option-button").first().click({ timeout: 10000 })
    await page.waitForTimeout(300)
  }
  const addBtn = page.getByTestId("add-product-button")
  await expect(addBtn).toBeEnabled({ timeout: 15000 })
  await addBtn.click()
  await page.waitForTimeout(2500)
  await page.goto("/kr/cart", { waitUntil: "networkidle" })
  await expect(page.getByTestId("free-shipping-progress")).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: "test-results/storefront/free_shipping.png", fullPage: true }).catch(()=>{})
})
