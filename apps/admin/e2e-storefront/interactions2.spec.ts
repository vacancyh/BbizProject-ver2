/**
 * 스토어프론트 추가 상호작용 — 쿠폰적용 / 적립금적용 / 소셜로그인(mock) / 재입고알림 / 회원탈퇴
 * 각 test 독립 실행(전체 타임아웃 회피).
 */
import { test, expect, Page } from "@playwright/test"
import path from "path"

const SHOT = (n: string) =>
  path.resolve(__dirname, `../test-results/storefront/int2_${n}.png`)

async function loginUI(page: Page, email: string, pw: string) {
  await page.goto("/kr/account", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("login-page")).toBeVisible({ timeout: 15000 })
  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill(pw)
  await page.getByTestId("sign-in-button").click()
  await expect(page.getByTestId("welcome-message")).toBeVisible({ timeout: 20000 })
}

async function addTshirtToCart(page: Page) {
  await page.goto("/kr/products/t-shirt", { waitUntil: "networkidle" })
  const groups = page.getByTestId("product-options")
  await expect(groups.first()).toBeVisible({ timeout: 15000 })
  const gc = await groups.count()
  for (let i = 0; i < gc; i++) {
    await groups.nth(i).getByTestId("option-button").first().click({ timeout: 10000 })
    await page.waitForTimeout(300)
  }
  const addBtn = page.getByTestId("add-product-button")
  await expect(addBtn).toBeEnabled({ timeout: 15000 })
  await addBtn.click()
  await page.waitForTimeout(2500)
}

test("적립금 장바구니 적용/해제", async ({ page }) => {
  test.setTimeout(120000)
  await loginUI(page, "qa-points@kr-demo.local", "qa1234!")
  await addTshirtToCart(page)
  await page.goto("/kr/cart", { waitUntil: "domcontentloaded" })
  const pa = page.getByTestId("points-apply")
  await expect(pa, "적립금 적용 UI 미노출(잔액 0?)").toBeVisible({ timeout: 15000 })
  await page.getByTestId("points-input").fill("300")
  await page.getByTestId("apply-points").click()
  await expect(page.getByTestId("remove-points")).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: SHOT("points_applied"), fullPage: false }).catch(() => {})
  await page.getByTestId("remove-points").click()
  await page.waitForTimeout(2000)
})

test("쿠폰 코드 체크아웃 적용", async ({ page }) => {
  test.setTimeout(150000)
  await loginUI(page, "qa-points@kr-demo.local", "qa1234!")
  await addTshirtToCart(page)
  await page.goto("/kr/cart", { waitUntil: "domcontentloaded" })
  await page.getByTestId("checkout-button").click()
  await page.waitForURL("**/checkout**", { timeout: 20000 })
  // 할인코드 입력 열기
  if (await page.getByTestId("add-discount-button").count()) {
    await page.getByTestId("add-discount-button").click().catch(() => {})
  }
  await expect(page.getByTestId("discount-input")).toBeVisible({ timeout: 15000 })
  await page.getByTestId("discount-input").fill("WELCOME10")
  await page.getByTestId("discount-apply-button").click()
  await expect(page.getByTestId("discount-row")).toBeVisible({ timeout: 15000 })
  await page.screenshot({ path: SHOT("coupon_applied"), fullPage: false }).catch(() => {})
})

test("소셜 로그인(카카오 mock)", async ({ page }) => {
  test.setTimeout(90000)
  await page.goto("/kr/account", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("kakao-login")).toBeVisible({ timeout: 15000 })
  await page.getByTestId("kakao-login").click()
  await expect(page.getByTestId("welcome-message")).toBeVisible({ timeout: 25000 })
  await page.screenshot({ path: SHOT("kakao"), fullPage: false }).catch(() => {})
})

test("재입고 알림 구독 라우트", async ({ request }) => {
  // 재입고 폼(restock-notify)은 변형이 실제 품절일 때만 노출(재고 게이팅).
  // 재고/Next 캐시 의존으로 UI 경로는 비결정적이라, 폼이 호출하는 실제 라우트를 직접 검증한다.
  test.setTimeout(30000)
  const KEY =
    "pk_b6ad2b93e9dc8259b154ca021d051acf2d13d74eec95ce598dfc7d36276083aa"
  const res = await request.post(
    "http://localhost:9000/store/restock-notifications",
    {
      headers: { "x-publishable-api-key": KEY, "Content-Type": "application/json" },
      data: {
        variant_id: "variant_01KV6TZQ838FG3QV8N4XCDFNWY",
        product_id: "prod_01KV6TZQ629D5VMAEMCN55XCX9",
        email: "restock-e2e@kr-demo.local",
      },
    }
  )
  expect([200, 201]).toContain(res.status())
  const body = await res.json()
  expect(body.subscribed).toBeTruthy()
})

test("회원 탈퇴", async ({ page }) => {
  test.setTimeout(120000)
  const email = `wd${Date.now()}@kr-demo.local`
  // 신규 가입
  await page.goto("/kr/account", { waitUntil: "domcontentloaded" })
  await page.getByRole("button", { name: "회원가입" }).click({ timeout: 10000 })
  await page.getByTestId("first-name-input").fill("탈퇴")
  await page.getByTestId("last-name-input").fill("테")
  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("phone-input").fill("010-9999-0000")
  await page.getByTestId("password-input").fill("wd123456!")
  await page.getByRole("button", { name: "가입하기" }).click()
  await expect(page.getByTestId("welcome-message")).toBeVisible({ timeout: 20000 })
  // 프로필 → 탈퇴
  await page.goto("/kr/account/profile", { waitUntil: "networkidle" })
  const openWd = page.getByTestId("open-withdraw")
  await openWd.scrollIntoViewIfNeeded()
  // sticky 헤더가 클릭을 가로채므로 React onClick 을 직접 트리거
  await openWd.evaluate((el) => (el as HTMLElement).click())
  const confirmWd = page.getByTestId("confirm-withdraw")
  await expect(confirmWd).toBeVisible({ timeout: 10000 })
  await confirmWd.evaluate((el) => (el as HTMLElement).click())
  await page.waitForTimeout(3000)
  // 탈퇴 후 로그인 화면으로 돌아오는지(account 진입 시 login-page)
  await page.goto("/kr/account", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("login-page")).toBeVisible({ timeout: 15000 })
})
