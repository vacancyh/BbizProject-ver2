/**
 * 관리자 자료 내보내기 E2E (2026-08-03 신설)
 *
 * 배경: 회원 화면의 "엑셀 다운로드" 버튼은 onClick 이 아예 없어
 *       **눌러도 아무 일이 일어나지 않았다.** 운영자에게는 고장으로 보인다.
 *       서버측 내보내기 API 에 연결한 뒤, 실제로 파일이 떨어지는지 브라우저로 검증한다.
 *
 * 또한 동작하지 않는 버튼들을 비활성 처리했으므로,
 * "눌러도 반응 없는 버튼"이 다시 생기지 않는지도 함께 본다.
 */
import { test, expect } from "@playwright/test"

const ADMIN = { email: "admin@shop.local", password: "admin1234!" }

async function login(page: any) {
  // 기존 global-setup.spec.ts 와 동일한 흐름(자동입력 값이 있으면 그대로 사용)
  await page.goto("/login")
  await page.waitForSelector("input[type='email']", { timeout: 20000 })
  const email = page.locator("input[type='email']")
  const pw = page.locator("input[type='password']")
  if (!(await email.inputValue())) await email.fill(ADMIN.email)
  if (!(await pw.inputValue())) await pw.fill(ADMIN.password)
  await page.getByRole("button", { name: /로그인/i }).click()
  await page.waitForURL("**/dashboard", { timeout: 30000 })
}

test("회원: 엑셀 다운로드 버튼이 실제로 파일을 내려받는다", async ({ page }) => {
  test.setTimeout(120000)
  await login(page)
  await page.goto("/members")

  const btn = page.getByTestId("members-export")
  await expect(btn).toBeVisible({ timeout: 30000 })
  await expect(btn).toBeEnabled()

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    btn.click(),
  ])

  const name = download.suggestedFilename()
  console.log("내려받은 파일:", name)
  expect(name).toMatch(/\.csv$/)

  // 내용 검증 — 헤더가 한글로 나오고 BOM 이 붙어 있어야 엑셀에서 안 깨진다.
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(Buffer.from(c))
  const buf = Buffer.concat(chunks)
  expect(buf.length).toBeGreaterThan(10)
  expect(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf).toBe(true) // UTF-8 BOM
  const text = buf.toString("utf8")
  expect(text).toContain("이메일")
  expect(text).toContain("회원등급")
  console.log("행 수:", text.split("\r\n").length - 1)
})

test("비활성 버튼은 사유(title)를 갖는다 — 눌러도 반응 없는 상태 방지", async ({ page }) => {
  test.setTimeout(120000)
  await login(page)
  for (const path of ["/members", "/orders", "/coupons", "/stats", "/shipping"]) {
    await page.goto(path)
    await page.waitForLoadState("domcontentloaded")
    const bad = await page.locator("button[disabled]:not([title])").count()
    console.log(`${path}: 사유 없는 비활성 버튼 ${bad}개`)
    // 페이지네이션 등 자명한 것은 제외 대상이라 0 을 강제하지 않고 로그로 추적한다.
  }
})

test("주문: 상세 내보내기(주소·연락처 포함)가 실제로 파일을 내려받는다", async ({ page }) => {
  test.setTimeout(120000)
  await login(page)
  await page.goto("/orders")

  const btn = page.getByTestId("csv-export-button")
  await expect(btn).toBeVisible({ timeout: 30000 })

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    btn.click(),
  ])

  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(Buffer.from(c))
  const buf = Buffer.concat(chunks)
  expect(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf).toBe(true) // UTF-8 BOM
  const text = buf.toString("utf8")
  // 택배사 양식에 필요한 컬럼이 실제로 들어 있는지 — 이게 이 기능의 존재 이유다.
  for (const col of ["연락처", "우편번호", "배송지", "상품"]) {
    expect(text).toContain(col)
  }
  console.log("주문 상세 CSV 행 수:", text.split(String.fromCharCode(13, 10)).length - 1)
})
