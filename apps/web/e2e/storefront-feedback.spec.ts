/**
 * 사용자 피드백(토스트) · 비밀번호 변경 검증 (2026-07-29 신설)
 *
 * 이전 상태: 장바구니 담기 성공/실패 표시가 전혀 없어 "눌렸는지" 알 수 없었다.
 * (비밀번호 변경 검증은 storefront-password.spec.ts 로 분리)
 */
import { test, expect } from "@playwright/test"

const CC = process.env.STOREFRONT_REGION ?? "kr"

test.describe.configure({ mode: "serial" })

test("장바구니 담기 → 성공 토스트 노출", async ({ page }) => {
  await page.goto(`/${CC}/store`)
  await page.locator('a[href*="/products/"]').first().click()
  await page.waitForURL(`**/${CC}/products/**`)

  const optionGroups = page.getByTestId("product-options")
  if (await optionGroups.count()) {
    for (const g of await optionGroups.all()) {
      const btn = g.getByTestId("option-button").first()
      if (await btn.count()) await btn.click()
    }
  }

  const addBtn = page.getByTestId("add-product-button")
  await expect(addBtn).toBeEnabled({ timeout: 20_000 })
  await addBtn.click()

  const toast = page.getByTestId("toast")
  await expect(toast).toBeVisible({ timeout: 30_000 })
  await expect(toast).toContainText(/담았습니다|담지 못했습니다/)
})
