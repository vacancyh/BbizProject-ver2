/**
 * 비밀번호 변경 전 구간 검증 (2026-07-29 신설)
 *
 * 이전 상태: 마이페이지에 비밀번호 변경 UI 가 아예 배치돼 있지 않았고,
 *            핸들러는 "not implemented" 로그만 찍었다. 코어의 update 엔드포인트는
 *            재설정 토큰을 요구해 로그인 사용자가 쓸 수 없어 전용 store 라우트를 만들었다.
 *
 * 검증: ①확인 불일치 차단 ②현재 비밀번호 오입력 차단 ③정상 변경 ④새 비밀번호로 실제 로그인
 * 전용 계정을 만들어 쓰므로 데모 계정 비밀번호는 바뀌지 않는다.
 */
import { test, expect } from "@playwright/test"

test("비밀번호 변경: 검증 → 실제 변경 → 새 비밀번호로 로그인", async ({ page, request }) => {
  test.setTimeout(180000)
  const email = `pwreal_${Date.now()}@kr-e2e.local`
  const oldPw = "oldpass1234!"
  const newPw = "newpass1234!"
  // 키가 없으면 계정 생성이 조용히 실패해 엉뚱한 지점에서 깨진다 → 여기서 명확히 멈춘다.
  expect(
    process.env.PUBKEY,
    "PUBKEY(publishable key) 미설정 — playwright.config.ts 가 .env.local 에서 읽지 못했습니다."
  ).toBeTruthy()
  const PUB = process.env.PUBKEY as string

  // API 로 계정 생성(폼 셀렉터 의존 제거)
  const reg = await request.post("http://localhost:9000/auth/customer/emailpass/register", {
    headers: { "content-type": "application/json", "x-publishable-api-key": PUB },
    data: { email, password: oldPw },
  })
  const token = (await reg.json()).token
  await request.post("http://localhost:9000/store/customers", {
    headers: { "content-type": "application/json", "x-publishable-api-key": PUB, authorization: `Bearer ${token}` },
    data: { email, first_name: "비번", last_name: "변경" },
  })

  // 세션 쿠키를 직접 주입해 로그인 상태로 만든다(폼 흐름과 무관하게 안정적)
  const login = await request.post("http://localhost:9000/auth/customer/emailpass", {
    headers: { "content-type": "application/json", "x-publishable-api-key": PUB },
    data: { email, password: oldPw },
  })
  const sessionToken = (await login.json()).token
  await page.context().addCookies([
    { name: "_medusa_jwt", value: sessionToken, domain: "localhost", path: "/" },
  ])
  await page.goto("/kr/account/profile")

  const editor = page.getByTestId("account-password-editor")
  await expect(editor).toBeVisible({ timeout: 30000 })
  // opacity-0 도 Playwright 는 visible 로 보므로, 항상 '수정'을 눌러 패널을 연다
  await editor.getByTestId("edit-button").click()
  await expect(editor.getByTestId("save-button")).toBeEnabled({ timeout: 10000 })
  await page.waitForTimeout(500)

  // 1) 불일치 → 오류 안내
  await page.getByTestId("old-password-input").fill(oldPw)
  await page.getByTestId("new-password-input").fill(newPw)
  await page.getByTestId("confirm-password-input").fill("mismatch1234!")
  await editor.getByTestId("save-button").click()
  await expect(page.getByTestId("toast")).toContainText("일치하지 않습니다", { timeout: 20000 })
  console.log("① 불일치 검증 OK")

  await expect(page.getByTestId("toast")).toHaveCount(0, { timeout: 15000 })

  // 2) 현재 비밀번호 오입력 → 실패 안내
  await page.getByTestId("old-password-input").fill("wrongpass1234!")
  await page.getByTestId("new-password-input").fill(newPw)
  await page.getByTestId("confirm-password-input").fill(newPw)
  await editor.getByTestId("save-button").click()
  await expect(page.getByTestId("toast")).toContainText("현재 비밀번호가 올바르지 않습니다", { timeout: 20000 })
  console.log("② 현재 비밀번호 검증 OK")

  await expect(page.getByTestId("toast")).toHaveCount(0, { timeout: 15000 })

  // 3) 정상 변경
  await page.getByTestId("old-password-input").fill(oldPw)
  await page.getByTestId("new-password-input").fill(newPw)
  await page.getByTestId("confirm-password-input").fill(newPw)
  await editor.getByTestId("save-button").click()
  await expect(page.getByTestId("toast")).toContainText("변경되었습니다", { timeout: 30000 })
  console.log("③ 변경 성공 토스트 OK")

  // 4) 실제로 새 비밀번호로 로그인되는지 API 로 확인
  const loginNew = await request.post("http://localhost:9000/auth/customer/emailpass", {
    headers: { "content-type": "application/json", "x-publishable-api-key": PUB },
    data: { email, password: newPw },
  })
  const loginOld = await request.post("http://localhost:9000/auth/customer/emailpass", {
    headers: { "content-type": "application/json", "x-publishable-api-key": PUB },
    data: { email, password: oldPw },
  })
  console.log("④ 새 비밀번호 로그인:", loginNew.status(), "/ 옛 비밀번호 로그인:", loginOld.status())
  expect(loginNew.status()).toBe(200)
  expect(loginOld.status()).not.toBe(200)
})
