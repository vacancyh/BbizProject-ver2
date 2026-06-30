/**
 * 고객센터(공지/FAQ) — 스토어프론트 실데이터 노출 검증.
 * 백엔드 cms 모듈(/store/notices, /store/faqs) → 화면 렌더 확인.
 */
import { test, expect } from "@playwright/test"

test("고객센터 공지/FAQ 실데이터 노출", async ({ page }) => {
  test.setTimeout(60000)
  await page.goto("/kr/customer-service", { waitUntil: "networkidle" })
  // 시드 공지 노출
  await expect(
    page.getByText("[안내] 설 연휴 배송 일정 안내").first()
  ).toBeVisible({ timeout: 15000 })
  // 시드 FAQ 노출
  await expect(
    page.getByText("배송은 얼마나 걸리나요?").first()
  ).toBeVisible({ timeout: 15000 })
  await page.screenshot({
    path: "test-results/storefront/cs_customer_service.png",
    fullPage: true,
  }).catch(() => {})
})
