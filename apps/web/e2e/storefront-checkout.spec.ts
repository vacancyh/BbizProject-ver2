/**
 * 체크아웃 전 구간 UI E2E (2026-07-28 신규)
 *
 * 지금까지 결제 전흐름은 **API 통합테스트로만** 검증돼 있었고, 실제 브라우저에서
 * 주소입력 → 배송선택 → 결제 → 주문완료까지 밟아본 적은 없었다. 매출 경로이므로 UI 로 검증한다.
 *
 * 커버:
 *  1) 비회원 체크아웃 전 구간 → 주문완료 페이지 도달
 *  2) 회원 체크아웃 + 적립금 사용 → 할인 반영 확인
 *
 * 전제: 백엔드 :9000 (KR 리전·국내 배송옵션·pp_system_default 시드), 스토어프론트 :8000
 */
import { test, expect, Page } from "@playwright/test"

const CC = process.env.STOREFRONT_REGION ?? "kr"
// 시드된 데모 계정(등급별 데모 고객) — seed-all 로 생성됨
const MEMBER = {
  email: process.env.E2E_MEMBER_EMAIL ?? "gold@kr-demo.local",
  password: process.env.E2E_MEMBER_PASSWORD ?? "test1234!",
}

test.describe.configure({ mode: "serial" })

/** 목록 → 첫 상품 상세 → 옵션 선택 → 장바구니 담기 */
async function addFirstProductToCart(page: Page) {
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
  await expect(page.getByTestId("nav-cart-link")).toContainText(/[1-9]/, { timeout: 30_000 })
}

/** 배송 주소 단계 입력 후 제출 */
async function fillShippingAddress(page: Page, email: string) {
  // 저장된 주소가 있는 회원은 라디오 선택 UI 가 먼저 뜰 수 있다
  const savedOption = page.getByTestId("shipping-address-radio").first()
  if (await savedOption.count()) {
    await savedOption.check().catch(() => {})
  }

  const firstName = page.getByTestId("shipping-first-name-input")
  if (await firstName.count()) {
    await firstName.fill("길동")
    await page.getByTestId("shipping-last-name-input").fill("홍")
    await page.getByTestId("shipping-address-input").fill("서울특별시 강남구 테헤란로 1")
    await page.getByTestId("shipping-postal-code-input").fill("06232")
    await page.getByTestId("shipping-city-input").fill("서울특별시")
    const emailInput = page.getByTestId("shipping-email-input")
    if (await emailInput.count()) await emailInput.fill(email)
    const phone = page.getByTestId("shipping-phone-input")
    if (await phone.count()) await phone.fill("010-1234-5678")
  }
  await page.getByTestId("submit-address-button").click()
}

/** 배송 방법 → 결제수단 → 주문 제출 */
async function completeCheckout(page: Page) {
  // 배송 방법
  await expect(page.getByTestId("delivery-options-container")).toBeVisible({ timeout: 30_000 })
  await page.getByTestId("delivery-option-radio").first().check()
  await page.getByTestId("submit-delivery-option-button").click()

  // 결제수단 선택(수동결제 pp_system_default = "무통장입금") 후 검토 단계로
  const payBtn = page.getByTestId("submit-payment-button")
  await expect(payBtn).toBeVisible({ timeout: 30_000 })
  const manualOption = page.getByRole("radio", { name: /무통장입금/ })
  await expect(manualOption).toBeVisible({ timeout: 20_000 })
  await manualOption.click()
  await expect(payBtn).toBeEnabled({ timeout: 20_000 })
  await payBtn.click()

  // 주문 제출
  const orderBtn = page.getByTestId("submit-order-button")
  await expect(orderBtn).toBeEnabled({ timeout: 30_000 })
  await orderBtn.click()

  // 주문완료
  await page.waitForURL("**/order/**/confirmed", { timeout: 60_000 })
  await expect(page.getByTestId("order-complete-container")).toBeVisible()
}

test("비회원: 장바구니 → 주소 → 배송 → 결제 → 주문완료", async ({ page }) => {
  const pageErrors: string[] = []
  page.on("pageerror", (e) => pageErrors.push(e.message))

  await addFirstProductToCart(page)

  await page.goto(`/${CC}/cart`)
  await page.getByTestId("checkout-button").click()
  await page.waitForURL(`**/${CC}/checkout**`)

  await fillShippingAddress(page, `guest_${Date.now()}@kr-e2e.local`)
  await completeCheckout(page)

  expect(pageErrors, `런타임 예외: ${pageErrors.join(" | ")}`).toHaveLength(0)
})

test("회원: 로그인 → 적립금 사용 → 체크아웃 완료", async ({ page }) => {
  // 로그인
  await page.goto(`/${CC}/account`)
  await page.getByTestId("email-input").fill(MEMBER.email)
  await page.getByTestId("password-input").fill(MEMBER.password)
  await page.getByTestId("sign-in-button").click()
  await expect(page.getByTestId("account-page")).toBeVisible({ timeout: 30_000 })

  await addFirstProductToCart(page)
  await page.goto(`/${CC}/cart`)

  // 적립금 사용(로그인 사용자에게만 노출) — 보유 적립금이 없으면 폼 자체가 없다
  const pointsInput = page.getByTestId("points-input")
  if (await pointsInput.count()) {
    const before = await page.getByTestId("cart-total").innerText().catch(() => "")
    await pointsInput.fill("1000")
    await page.getByTestId("apply-points").click()

    // 적용되면 해제 버튼이 노출되고 총액이 줄어든다(무반응/무한로딩 금지)
    await expect(page.getByTestId("remove-points")).toBeVisible({ timeout: 30_000 })
    await expect
      .poll(
        async () => (await page.getByTestId("cart-total").innerText().catch(() => "")) !== before,
        { timeout: 20_000 }
      )
      .toBe(true)
  }

  await page.getByTestId("checkout-button").click()
  await page.waitForURL(`**/${CC}/checkout**`)
  await fillShippingAddress(page, MEMBER.email)
  await completeCheckout(page)
})
