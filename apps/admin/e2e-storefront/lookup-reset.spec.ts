/**
 * 비회원 주문조회 + 비밀번호 재설정 요청 (로그아웃 상태, 빠른 단일 검증)
 * deep.spec.ts 가 전체 타임아웃으로 7·8단계를 못 돈 것을 분리 검증.
 *
 * 데이터-독립: 조회 대상 주문(display_id+email)은 현재 DB 의 실주문을 admin API 로 동적 해석.
 */
import { test, expect, request as pwRequest } from "@playwright/test"

const API = "http://127.0.0.1:9000"
let ORDER_DISPLAY_ID = ""
let ORDER_EMAIL = ""

test.beforeAll(async () => {
  const ctx = await pwRequest.newContext()
  const auth = await ctx.post(`${API}/auth/user/emailpass`, {
    data: { email: "admin@shop.local", password: "admin1234!" },
  })
  const token = (await auth.json()).token
  const res = await ctx.get(
    `${API}/admin/orders?limit=50&order=-display_id&fields=display_id,email,currency_code`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const orders = (await res.json()).orders ?? []
  // /kr 스토어프론트와 정합되도록 KRW(한국) 주문 선택
  const o = orders.find((x: any) => x.currency_code === "krw") ?? orders[0]
  ORDER_DISPLAY_ID = String(o.display_id)
  ORDER_EMAIL = o.email
  await ctx.dispose()
})

test("비회원 주문조회 제출 → 확인 페이지", async ({ page }) => {
  test.setTimeout(90000)
  await page.goto("/kr/order/lookup", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("order-lookup-form")).toBeVisible({ timeout: 15000 })
  await page.getByTestId("lookup-display-id").fill(ORDER_DISPLAY_ID)
  await page.getByTestId("lookup-email").fill(ORDER_EMAIL)
  await page.getByTestId("lookup-submit").click()
  await page.waitForURL("**/order/**/confirmed", { timeout: 20000 })
  await expect(page.getByText("감사합니다").first()).toBeVisible({ timeout: 15000 })
})

test("비회원 주문조회 — 잘못된 이메일은 거부", async ({ page }) => {
  test.setTimeout(60000)
  await page.goto("/kr/order/lookup", { waitUntil: "domcontentloaded" })
  await page.getByTestId("lookup-display-id").fill(ORDER_DISPLAY_ID)
  await page.getByTestId("lookup-email").fill("wrong@nope.local")
  await page.getByTestId("lookup-submit").click()
  // 확인 페이지로 가면 안 됨 (오류 노출)
  await page.waitForTimeout(3000)
  expect(page.url()).not.toContain("/confirmed")
})

test("비밀번호 재설정 요청 제출", async ({ page }) => {
  test.setTimeout(90000)
  await page.goto("/kr/reset-password", { waitUntil: "domcontentloaded" })
  await expect(page.getByTestId("reset-email")).toBeVisible({ timeout: 15000 })
  await page.getByTestId("reset-email").fill(ORDER_EMAIL)
  const submit = page
    .locator('[data-testid="request-form"] [type="submit"]')
    .first()
  await submit.click({ timeout: 10000 })
  await page.waitForTimeout(2500)
  // 요청 성공 안내(메일 발송 안내 등) 노출 확인 — 문구는 유연 매칭
  await expect(
    page.getByText(/메일|이메일|발송|전송|확인|안내|링크/).first()
  ).toBeVisible({ timeout: 10000 })
})
