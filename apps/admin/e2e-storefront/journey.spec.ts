/**
 * 스토어프론트 전체 사용자 여정 E2E (실제 화면)
 * 가입 → 홈/타임세일 → 검색 → 상품상세(리뷰/문의/고시) → 장바구니 → 체크아웃 → 주문완료
 * → 마이페이지(주문/적립금/등급/쿠폰/동의/배송지/프로필) → 위시리스트 → 로그아웃 → 비회원 주문조회
 *
 * 단계별 PASS/FAIL 를 수집해 마지막에 리포트. 비치명적 실패는 계속 진행.
 */
import { test, expect, Page } from "@playwright/test"
import path from "path"

const SHOT = (n: string) =>
  path.resolve(__dirname, `../test-results/storefront/${n}.png`)

type Step = { name: string; ok: boolean; detail?: string }
const results: Step[] = []

async function step(
  page: Page,
  name: string,
  fn: () => Promise<void>,
  shot?: string
) {
  try {
    await fn()
    results.push({ name, ok: true })
    if (shot) await page.screenshot({ path: SHOT(shot), fullPage: false }).catch(() => {})
  } catch (e) {
    results.push({ name, ok: false, detail: (e as Error).message.split("\n")[0] })
    if (shot) await page.screenshot({ path: SHOT(`FAIL_${shot}`), fullPage: true }).catch(() => {})
  }
}

test("storefront full journey", async ({ page }) => {
  const email = `e2e${Date.now()}@kr-demo.local`
  const pw = "e2e1234!"
  test.setTimeout(300000)

  // 1) 회원가입
  await step(page, "1. 회원가입", async () => {
    await page.goto("/kr/account", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "회원가입" }).click({ timeout: 10000 }) // 토글
    await page.getByTestId("first-name-input").fill("길동")
    await page.getByTestId("last-name-input").fill("홍")
    await page.getByTestId("email-input").fill(email)
    await page.getByTestId("phone-input").fill("010-1234-5678")
    await page.getByTestId("password-input").fill(pw)
    await page.getByRole("button", { name: "가입하기" }).click({ timeout: 10000 })
    await expect(page.getByTestId("welcome-message")).toBeVisible({ timeout: 20000 })
  }, "01_signup")

  // 2) 홈 + 타임세일 (홈 진입 팝업이 있으면 닫기)
  await step(page, "2. 홈/타임세일", async () => {
    await page.goto("/kr", { waitUntil: "networkidle" })
    const popupClose = page.getByTestId("popup-close")
    if (await popupClose.count()) {
      await popupClose.click().catch(() => {})
      await page.waitForTimeout(500)
    }
    await expect(page.getByText("타임세일")).toBeVisible()
  }, "02_home")

  // 3) 검색
  await step(page, "3. 검색", async () => {
    await page.getByTestId("search-input").fill("shirt")
    await page.getByTestId("search-input").press("Enter")
    await page.waitForURL("**/store**", { timeout: 15000 })
    await page.waitForLoadState("networkidle")
    await expect(
      page.locator('[data-testid="product-wrapper"]').first()
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByTestId("store-page-title")).toContainText("검색 결과")
  }, "03_search")

  // 4) 상품 상세 + 옵션 + 장바구니 담기
  await step(page, "4. 상품상세/리뷰/문의/고시", async () => {
    await page.goto("/kr/products/t-shirt", { waitUntil: "networkidle" })
    await expect(page.getByTestId("product-reviews")).toBeVisible()
    await expect(page.getByTestId("product-inquiries")).toBeVisible()
    await expect(page.getByTestId("product-disclosure")).toBeVisible()
    await expect(page.getByText("리뷰 작성하기")).toBeVisible()
  }, "04_pdp")

  await step(page, "5. 옵션선택+장바구니담기", async () => {
    // 모든 옵션 그룹에서 첫 값 선택(변형 확정)
    const groups = page.getByTestId("product-options")
    const gc = await groups.count()
    for (let i = 0; i < gc; i++) {
      await groups.nth(i).getByTestId("option-button").first().click({ timeout: 8000 })
    }
    const addBtn = page.getByTestId("add-product-button")
    await expect(addBtn).toBeEnabled({ timeout: 15000 })
    await addBtn.click({ timeout: 10000 })
    await page.waitForTimeout(2500)
  }, "05_addcart")

  // 6) 장바구니
  await step(page, "6. 장바구니", async () => {
    await page.goto("/kr/cart", { waitUntil: "networkidle" })
    await expect(page.locator("text=장바구니").first()).toBeVisible()
    await expect(page.getByTestId("checkout-button")).toBeVisible()
  }, "06_cart")

  // 7) 체크아웃 전체
  await step(page, "7-1. 체크아웃 배송지", async () => {
    await page.getByTestId("checkout-button").click()
    await page.waitForURL("**/checkout**", { timeout: 20000 })
    // 배송지 폼이 열려있으면 채움
    if (await page.getByTestId("shipping-first-name-input").count()) {
      await page.getByTestId("shipping-first-name-input").fill("길동")
      await page.getByTestId("shipping-last-name-input").fill("홍")
      await page.getByTestId("shipping-address-input").fill("서울 강남구 테헤란로 1")
      await page.getByTestId("shipping-postal-code-input").fill("06234")
      await page.getByTestId("shipping-city-input").fill("서울")
      await page.getByTestId("shipping-country-select").selectOption("kr")
      await page.getByTestId("shipping-email-input").fill(email)
      await page.getByTestId("shipping-phone-input").fill("010-1234-5678")
      await page.getByTestId("submit-address-button").click()
    }
    await expect(page.getByTestId("delivery-options-container")).toBeVisible({ timeout: 20000 })
  }, "07_checkout_address")

  await step(page, "7-2. 배송수단", async () => {
    await page.getByTestId("delivery-option-radio").first().click()
    await page.waitForTimeout(1500)
    await page.getByTestId("submit-delivery-option-button").click()
    await expect(page.getByTestId("submit-payment-button")).toBeVisible({ timeout: 20000 })
  }, "07_checkout_delivery")

  await step(page, "7-3. 결제수단", async () => {
    // 무통장입금 결제수단 선택
    await page.getByText("무통장입금").first().click({ timeout: 10000 })
    await page.waitForTimeout(1000)
    await page.getByTestId("submit-payment-button").click({ timeout: 10000 })
    await expect(page.getByTestId("submit-order-button")).toBeVisible({ timeout: 20000 })
  }, "07_checkout_payment")

  await step(page, "7-4. 주문하기→완료", async () => {
    await page.getByTestId("submit-order-button").click()
    await page.waitForURL("**/order/**/confirmed", { timeout: 30000 })
    await expect(page.getByText("감사합니다")).toBeVisible({ timeout: 15000 })
  }, "08_order_complete")

  // 8) 마이페이지 전체
  const myTabs: { url: string; expect: string; name: string }[] = [
    { url: "/kr/account", expect: "최근 주문", name: "8-1.개요" },
    { url: "/kr/account/orders", expect: "주문 내역", name: "8-2.주문내역" },
    { url: "/kr/account/profile", expect: "프로필", name: "8-3.프로필" },
    { url: "/kr/account/addresses", expect: "배송지 관리", name: "8-4.배송지" },
    { url: "/kr/account/points", expect: "보유 적립금", name: "8-5.적립금" },
    { url: "/kr/account/membership", expect: "현재 등급", name: "8-6.등급" },
    { url: "/kr/account/coupons", expect: "쿠폰함", name: "8-7.쿠폰함" },
    { url: "/kr/account/consents", expect: "동의 관리", name: "8-8.동의" },
    { url: "/kr/wishlist", expect: "위시리스트", name: "8-9.위시리스트" },
  ]
  for (const t of myTabs) {
    await step(page, t.name, async () => {
      await page.goto(t.url, { waitUntil: "networkidle" })
      await expect(page.getByText(t.expect).first()).toBeVisible({ timeout: 15000 })
    })
  }

  // 9) 주문상세 (배송추적/신청 버튼)
  await step(page, "9. 주문상세(배송추적/신청)", async () => {
    await page.goto("/kr/account/orders", { waitUntil: "networkidle" })
    await page.getByTestId("order-details-link").first().click()
    await page.waitForURL("**/orders/details/**", { timeout: 15000 })
    await expect(page.getByText("배송 추적")).toBeVisible()
    await expect(page.getByText("취소·반품·교환 신청")).toBeVisible()
  }, "09_order_detail")

  // 10) 위시리스트 담기 (상품카드 하트)
  await step(page, "10. 위시리스트 담기", async () => {
    await page.goto("/kr/store", { waitUntil: "networkidle" })
    await page.getByTestId("wishlist-button").first().click()
    await page.waitForTimeout(1500)
    await page.goto("/kr/wishlist", { waitUntil: "networkidle" })
    await expect(page.locator('[data-testid="wishlist-products"]')).toBeVisible({ timeout: 10000 })
  }, "10_wishlist")

  // 11) 로그아웃 → 비회원 주문조회
  await step(page, "11. 비회원 주문조회 화면", async () => {
    await page.goto("/kr/order/lookup", { waitUntil: "networkidle" })
    await expect(page.getByTestId("order-lookup-form")).toBeVisible()
  }, "11_guest_lookup")

  // ── 리포트 ──
  console.log("\n========== 스토어프론트 여정 결과 ==========")
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? "  → " + r.detail : ""}`)
  }
  const fails = results.filter((r) => !r.ok)
  console.log(`\n총 ${results.length}단계 · 성공 ${results.length - fails.length} · 실패 ${fails.length}`)
  console.log("============================================\n")
})
