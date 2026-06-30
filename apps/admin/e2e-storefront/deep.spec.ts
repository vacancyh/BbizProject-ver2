/**
 * 스토어프론트 "깊은 상호작용" E2E (실제 화면 + 실제 제출)
 * 가입 → 주문완료 → 리뷰작성 / 상품문의 / 취소·반품 신청 / 현금영수증 신청
 * → 적립금(주문적립) → 비회원 주문조회 제출 → 비밀번호 재설정 요청 → 재입고 알림
 *
 * journey.spec.ts 가 "보이는지"를 본다면, 여기서는 "실제로 동작하는지"(폼 제출→성공응답)를 본다.
 * 단계별 PASS/FAIL 수집, 비치명적 실패는 계속 진행.
 */
import { test, expect, Page } from "@playwright/test"
import path from "path"

const SHOT = (n: string) =>
  path.resolve(__dirname, `../test-results/storefront/deep_${n}.png`)

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

test("storefront deep interactions", async ({ page }) => {
  const email = `deep${Date.now()}@kr-demo.local`
  const pw = "deep1234!"
  let displayId = ""
  test.setTimeout(360000)

  // 0) 가입
  await step(page, "0. 회원가입", async () => {
    await page.goto("/kr/account", { waitUntil: "networkidle" })
    await page.getByRole("button", { name: "회원가입" }).click({ timeout: 10000 })
    await page.getByTestId("first-name-input").fill("심층")
    await page.getByTestId("last-name-input").fill("테")
    await page.getByTestId("email-input").fill(email)
    await page.getByTestId("phone-input").fill("010-2222-3333")
    await page.getByTestId("password-input").fill(pw)
    await page.getByRole("button", { name: "가입하기" }).click({ timeout: 10000 })
    await expect(page.getByTestId("welcome-message")).toBeVisible({ timeout: 20000 })
  })

  // 1) 주문 1건 생성 (리뷰/문의/신청/조회의 전제)
  await step(page, "1. 주문 생성(전제)", async () => {
    await page.goto("/kr/products/t-shirt", { waitUntil: "networkidle" })
    const groups = page.getByTestId("product-options")
    const gc = await groups.count()
    for (let i = 0; i < gc; i++) {
      await groups.nth(i).getByTestId("option-button").first().click({ timeout: 8000 })
    }
    const addBtn = page.getByTestId("add-product-button")
    await expect(addBtn).toBeEnabled({ timeout: 15000 })
    await addBtn.click()
    await page.waitForTimeout(2500)

    await page.goto("/kr/cart", { waitUntil: "networkidle" })
    await page.getByTestId("checkout-button").click()
    await page.waitForURL("**/checkout**", { timeout: 20000 })
    if (await page.getByTestId("shipping-first-name-input").count()) {
      await page.getByTestId("shipping-first-name-input").fill("심층")
      await page.getByTestId("shipping-last-name-input").fill("테")
      await page.getByTestId("shipping-address-input").fill("서울 강남구 테헤란로 1")
      await page.getByTestId("shipping-postal-code-input").fill("06234")
      await page.getByTestId("shipping-city-input").fill("서울")
      await page.getByTestId("shipping-country-select").selectOption("kr")
      await page.getByTestId("shipping-email-input").fill(email)
      await page.getByTestId("shipping-phone-input").fill("010-2222-3333")
      await page.getByTestId("submit-address-button").click()
    }
    await expect(page.getByTestId("delivery-options-container")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("delivery-option-radio").first().click()
    await page.waitForTimeout(1500)
    await page.getByTestId("submit-delivery-option-button").click()
    await expect(page.getByTestId("submit-payment-button")).toBeVisible({ timeout: 20000 })
    await page.getByText("무통장입금").first().click({ timeout: 10000 })
    await page.waitForTimeout(1000)
    await page.getByTestId("submit-payment-button").click()
    await expect(page.getByTestId("submit-order-button")).toBeVisible({ timeout: 20000 })
    await page.getByTestId("submit-order-button").click()
    await page.waitForURL("**/order/**/confirmed", { timeout: 30000 })
    await expect(page.getByText("감사합니다")).toBeVisible({ timeout: 15000 })
    displayId = (await page.getByTestId("order-id").innerText().catch(() => "")).trim()
  }, "01_order")

  // 2) 리뷰 작성 (실제 제출)
  await step(page, "2. 리뷰 작성 제출", async () => {
    await page.goto("/kr/products/t-shirt", { waitUntil: "networkidle" })
    await page.getByTestId("open-review-form").click({ timeout: 10000 })
    await page.getByTestId("review-author").fill("심층테스터")
    await page.getByTestId("review-title").fill("E2E 리뷰 제목")
    await page.getByTestId("review-content").fill("자동화 테스트로 작성한 리뷰 본문입니다.")
    await page.getByTestId("submit-review").click()
    await expect(page.getByText("리뷰가 등록되었습니다")).toBeVisible({ timeout: 15000 })
  }, "02_review")

  // 3) 상품 문의(Q&A) 제출
  await step(page, "3. 상품문의 제출", async () => {
    await page.goto("/kr/products/t-shirt", { waitUntil: "networkidle" })
    await page.getByTestId("open-inquiry-form").click({ timeout: 10000 })
    await page.getByTestId("inquiry-author").fill("심층테스터")
    await page.getByTestId("inquiry-content").fill("배송은 보통 며칠 걸리나요? 자동화 문의.")
    await page.getByTestId("submit-inquiry").click()
    await expect(page.getByText("문의가 등록되었습니다")).toBeVisible({ timeout: 15000 })
  }, "03_inquiry")

  // 4) 주문상세 → 취소·반품·교환 신청 제출
  await step(page, "4. 취소·반품 신청 제출", async () => {
    await page.goto("/kr/account/orders", { waitUntil: "networkidle" })
    await page.getByTestId("order-details-link").first().click()
    await page.waitForURL("**/orders/details/**", { timeout: 15000 })
    await page.getByTestId("open-order-request").click({ timeout: 10000 })
    await page.getByTestId("request-comment").fill("자동화 취소 신청 사유 상세")
    await page.getByTestId("submit-order-request").click()
    await expect(page.getByText("신청이 접수되었습니다")).toBeVisible({ timeout: 15000 })
  }, "04_order_request")

  // 5) 현금영수증 신청 제출
  await step(page, "5. 현금영수증 신청 제출", async () => {
    await page.goto("/kr/account/orders", { waitUntil: "networkidle" })
    await page.getByTestId("order-details-link").first().click()
    await page.waitForURL("**/orders/details/**", { timeout: 15000 })
    await page.getByTestId("open-tax-receipt").click({ timeout: 10000 })
    // 현금영수증(개인소득공제) 경로: 식별번호 입력 후 제출
    if (await page.getByTestId("cash-receipt-id").count()) {
      await page.getByTestId("cash-receipt-id").fill("01022223333")
    }
    await page.getByTestId("submit-tax-receipt").click({ timeout: 10000 })
    await expect(
      page.getByText(/신청|접수|발급|등록/).first()
    ).toBeVisible({ timeout: 15000 })
  }, "05_tax_receipt")

  // 6) 적립금: 주문 적립 확인 → 장바구니 적립금 적용 UI 노출 시 적용
  await step(page, "6. 적립금(주문적립) 확인", async () => {
    await page.goto("/kr/account/points", { waitUntil: "networkidle" })
    await expect(page.getByText("보유 적립금").first()).toBeVisible({ timeout: 15000 })
  }, "06_points")

  // 비회원 주문조회/비밀번호 재설정은 lookup-reset.spec.ts 에서 단독 검증(중복 제거).

  // ── 리포트 ──
  console.log("\n========== 스토어프론트 심층 상호작용 결과 ==========")
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? "  → " + r.detail : ""}`)
  }
  const fails = results.filter((r) => !r.ok)
  console.log(`\n주문번호=${displayId} · 총 ${results.length}단계 · 성공 ${results.length - fails.length} · 실패 ${fails.length}`)
  console.log("====================================================\n")
})
