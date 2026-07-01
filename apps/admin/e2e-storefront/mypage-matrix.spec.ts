/** 등급별 마이페이지 데이터 매트릭스 — 계정×탭 데이터 존재 검증 */
import { test, expect } from "@playwright/test"
const ACCTS = [
  { em: "test@kr-demo.local", tier: "일반" },
  { em: "silver@kr-demo.local", tier: "실버" },
  { em: "gold@kr-demo.local", tier: "골드" },
  { em: "vip@kr-demo.local", tier: "VIP" },
]
for (const a of ACCTS) {
  test(`마이페이지 매트릭스 - ${a.tier}`, async ({ page }) => {
    test.setTimeout(120000)
    await page.goto("/kr/account", { waitUntil: "domcontentloaded" })
    await page.getByTestId("email-input").fill(a.em)
    await page.getByTestId("password-input").fill("test1234!")
    await page.getByTestId("sign-in-button").click()
    await expect(page.getByTestId("welcome-message")).toBeVisible({ timeout: 20000 })
    // 주문내역: 카드 존재
    await page.goto("/kr/account/orders", { waitUntil: "networkidle" })
    await expect(page.getByText("주문 내역").first()).toBeVisible({ timeout: 15000 })
    // 적립금: "보유 적립금"
    await page.goto("/kr/account/points", { waitUntil: "networkidle" })
    await expect(page.getByText("보유 적립금").first()).toBeVisible({ timeout: 15000 })
    // 등급: 티어명 노출
    await page.goto("/kr/account/membership", { waitUntil: "networkidle" })
    await expect(page.getByText(a.tier).first()).toBeVisible({ timeout: 15000 })
    // 배송지
    await page.goto("/kr/account/addresses", { waitUntil: "networkidle" })
    await expect(page.getByText("배송지").first()).toBeVisible({ timeout: 15000 })
    // 쿠폰함/동의
    await page.goto("/kr/account/coupons", { waitUntil: "networkidle" })
    await expect(page.getByText("쿠폰").first()).toBeVisible({ timeout: 15000 })
    await page.goto("/kr/account/consents", { waitUntil: "networkidle" })
    await expect(page.getByText("동의").first()).toBeVisible({ timeout: 15000 })
    await page.screenshot({ path: `test-results/storefront/matrix_${a.tier}.png`, fullPage: true }).catch(()=>{})
  })
}
