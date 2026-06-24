/**
 * 상호작용 검증 (헬스 스윕의 '열림' 스모크 → 한 단계 깊게)
 * 탭 전환 / 검색 / 필터가 실제로 목록 재조회(네트워크)를 트리거하고 에러 없이 갱신되는지 확인.
 * 초기 로드는 networkidle 로 안정화(단독 waitForResponse 는 이미 끝난 요청을 놓치는 레이스가 있음).
 */
import { test, expect, Page } from "@playwright/test"

// 인터랙션 중 발생한 런타임/5xx 를 수집해 공통 검증
function trackErrors(page: Page) {
  const errs: string[] = []
  page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`))
  page.on("response", (r) => {
    if (r.status() >= 500 && (r.url().includes("/admin") || r.url().includes(":9000")))
      errs.push(`5xx: ${r.status()} ${r.url()}`)
  })
  return errs
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle").catch(() => {})
  await page.waitForTimeout(500)
}

test("주문관리: 상태 탭 전환 → orders-kr/search 재조회", async ({ page }) => {
  const errs = trackErrors(page)
  await page.goto("/orders")
  await settle(page)

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/admin/orders-kr/search"), { timeout: 30000 }),
    page.getByText("결제완료", { exact: false }).first().click(),
  ])
  expect(resp.status(), `결제완료 탭 재조회 응답`).toBeLessThan(400)
  await page.waitForTimeout(800)
  expect(errs, errs.join(" | ")).toHaveLength(0)
})

test("회원관리: 세그탭(정상 회원) 전환 → customers 재조회", async ({ page }) => {
  const errs = trackErrors(page)
  await page.goto("/members")
  await settle(page)

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/admin/customers"), { timeout: 30000 }),
    page.getByText("정상 회원", { exact: false }).first().click(),
  ])
  expect(resp.status(), `정상 회원 탭 재조회 응답`).toBeLessThan(400)
  await page.waitForTimeout(800)
  expect(errs, errs.join(" | ")).toHaveLength(0)
})

test("회원관리: 검색 입력 후 조회 → customers 재조회", async ({ page }) => {
  const errs = trackErrors(page)
  await page.goto("/members")
  await settle(page)

  await page.getByPlaceholder(/검색/).first().fill("kr")
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/admin/customers"), { timeout: 30000 }),
    page.getByRole("button", { name: "조회" }).click(),
  ])
  expect(resp.status(), `검색 조회 응답`).toBeLessThan(400)
  await page.waitForTimeout(800)
  expect(errs, errs.join(" | ")).toHaveLength(0)
})

test("상품관리: 필터/정렬 변경 → products 재조회", async ({ page }) => {
  const errs = trackErrors(page)
  await page.goto("/products")
  await settle(page)

  // 화면의 첫 select(카테고리/정렬)에서 옵션 변경 → 어느 쪽이든 목록 재조회 트리거
  const select = page.locator("select").first()
  const optionCount = await select.locator("option").count()
  test.skip(optionCount < 2, "선택 가능한 옵션이 없음")

  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/admin/products"), { timeout: 30000 }),
    select.selectOption({ index: 1 }),
  ])
  expect(resp.status(), `필터/정렬 재조회 응답`).toBeLessThan(400)
  await page.waitForTimeout(800)
  expect(errs, errs.join(" | ")).toHaveLength(0)
})
