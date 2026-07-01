/** 주문 상태별 화면 정밀 검증 — 각 주문 상세 순회하며 상태별 UI 렌더/무에러 확인 + 스크린샷 */
import { test, expect, Page } from "@playwright/test"

async function login(page: Page, email: string) {
  await page.goto("/kr/account", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("login-page")).toBeVisible({ timeout: 15000 })
  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill("test1234!")
  await page.getByTestId("sign-in-button").click()
  await expect(page.getByTestId("welcome-message")).toBeVisible({ timeout: 20000 })
}

for (const acct of ["vip@kr-demo.local", "gold@kr-demo.local"]) {
  test(`주문 상태별 상세 렌더 - ${acct}`, async ({ page }) => {
    test.setTimeout(180000)
    const errs: string[] = []
    page.on("pageerror", (e) => errs.push(e.message.slice(0, 100)))
    await login(page, acct)
    await page.goto("/kr/account/orders", { waitUntil: "networkidle" })

    const cards = page.getByTestId("order-card")
    const n = await cards.count()
    expect(n, "주문 카드 존재").toBeGreaterThan(0)
    const report: string[] = []

    for (let i = 0; i < n; i++) {
      const card = page.getByTestId("order-card").nth(i)
      const cardText = (await card.innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 60)
      const link = card.getByTestId("order-details-link")
      if (!(await link.count())) { report.push(`[${i}] 상세링크 없음: ${cardText}`); continue }
      await link.click()
      await page.waitForURL("**/orders/details/**", { timeout: 15000 }).catch(() => {})
      await page.waitForLoadState("networkidle").catch(() => {})
      // 상세 컨테이너 렌더 확인
      const okContainer = await page.getByTestId("order-details-container").isVisible().catch(() => false)
      // 배송 추적 섹션(모든 주문 공통)
      const okTracking = await page.getByTestId("shipping-tracking").isVisible().catch(() => false)
      // 상태 표시 텍스트 수집
      const body = await page.locator("main").innerText().catch(() => "")
      const states = ["배송중","배송완료","취소됨","준비 중","구매확정","취소·반품·교환 신청","반품","환불"].filter(s => body.includes(s))
      report.push(`[${i}] container=${okContainer} tracking=${okTracking} 상태:[${states.join(",")}]`)
      await page.screenshot({ path: `test-results/storefront/orderstate_${acct.split("@")[0]}_${i}.png`, fullPage: true }).catch(() => {})
      expect(okContainer, `주문${i} 상세 렌더`).toBeTruthy()
      await page.goto("/kr/account/orders", { waitUntil: "networkidle" })
    }
    console.log(`\n===== ${acct} 주문 ${n}건 상세 =====`)
    report.forEach(r => console.log("  " + r))
    console.log("pageerror:", errs.length, errs.slice(0,3).join(" | "))
    expect(errs, errs.join("\n")).toHaveLength(0)
  })
}
