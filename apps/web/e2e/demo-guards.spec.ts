/**
 * 데모 구현 안전장치 검증 (2026-08-03 신설)
 *
 * 배경: "진짜처럼 보이는 목(mock) 구현" 3건이 고객 화면에 그대로 노출돼 있었다.
 *
 *  ① 소셜 로그인 — `socialLoginMock` 이 하드코딩된 데모 계정으로 로그인시킨다.
 *     실측: 서로 다른 브라우저 컨텍스트 2개가 **같은 계정**(kakao-demo@kr-demo.local)에 들어갔다.
 *     운영에 나가면 고객 B 가 고객 A 의 주문내역·배송지를 그대로 본다.
 *
 *  ② 본인인증 — 인증번호가 고정값(000000)이고 화면에 표시되며, 결과가 서버로 가지 않는다.
 *     "✓ 본인인증이 완료되었습니다" 표시만 뜰 뿐 아무 데도 기록되지 않는다.
 *
 *  ③ 공지/FAQ — 백엔드가 비면 데모용 가짜 공지로 채웠다.
 *     운영자가 공지를 지우는 순간 이미 지난 "설 연휴 배송 일정" 이 고객에게 표시된다.
 *
 * 조치: 셋 다 **운영 빌드에서는 노출 자체를 막고**, 개발에서는 데모임을 눈에 띄게 알린다.
 * 이 테스트는 개발 환경에서 **경고가 제대로 붙어 있는지**를 지킨다.
 * (운영 차단 여부는 프로덕션 빌드로 별도 확인 — NODE_ENV 분기라 dev 에서는 검증 불가)
 */
import { test, expect } from "@playwright/test"

const CC = process.env.STOREFRONT_REGION ?? "kr"

test("소셜 로그인: 데모 경고가 버튼보다 먼저 보인다", async ({ page }) => {
  await page.goto(`/${CC}/account`)

  const warning = page.getByTestId("social-login-demo-warning")
  await expect(warning).toBeVisible({ timeout: 20_000 })
  await expect(warning).toContainText("같은 데모 계정")

  // 버튼 라벨에도 데모임이 드러나야 한다 — 경고를 안 읽는 사용자를 위해.
  await expect(page.getByTestId("kakao-login")).toContainText("데모")
  await expect(page.getByTestId("naver-login")).toContainText("데모")
})

test("본인인증: 데모 경고가 붙어 있고 인증 결과가 서버로 가지 않는다", async ({ page }) => {
  await page.goto(`/${CC}/account`)

  // 회원가입 화면으로 전환(클라이언트 상태)
  const toRegister = page.getByTestId("register-button")
  if (await toRegister.count()) {
    await toRegister.first().click()
  } else {
    await page.getByRole("button", { name: /가입|회원가입/ }).first().click()
  }

  const verify = page.getByTestId("phone-verify")
  await expect(verify).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId("phone-verify-demo-warning")).toContainText(
    "실제 본인인증이 아닙니다"
  )

  // 인증 과정에서 서버로 나가는 요청이 없어야 한다(= 저장되지 않는다는 사실을 고정)
  const reqs: string[] = []
  page.on("request", (r) => {
    if (/verify|auth|phone/i.test(r.url()) && !r.url().includes("_next")) reqs.push(r.url())
  })
  await page.getByTestId("verify-phone").fill("010-1234-5678")
  await page.getByRole("button", { name: "인증번호 발송" }).click()
  await page.getByTestId("verify-code").fill("000000")
  await page.getByRole("button", { name: "확인" }).click()
  await expect(page.getByTestId("phone-verified")).toBeVisible({ timeout: 10_000 })

  expect(reqs, "본인인증이 서버로 전송되지 않는다는 사실을 고정한다").toHaveLength(0)
})

test("고객센터: 공지·FAQ 가 비어도 가짜 데이터 대신 안내가 나온다", async ({ page }) => {
  await page.goto(`/${CC}/customer-service`)
  await page.waitForLoadState("domcontentloaded")

  const notices = page.getByTestId("cs-notices")
  await expect(notices).toBeVisible({ timeout: 20_000 })

  // 목록이 비었으면 반드시 안내 문구가 있어야 한다(제목만 남고 텅 비면 고장으로 보인다)
  const items = await notices.locator("li").count()
  if (items === 0) {
    await expect(page.getByTestId("cs-notices-empty")).toBeVisible()
  }
  const faqs = page.getByTestId("cs-faqs")
  const faqItems = await faqs.locator("li").count()
  if (faqItems === 0) {
    await expect(page.getByTestId("cs-faqs-empty")).toBeVisible()
  }
  console.log(`  공지 ${items}건 · FAQ ${faqItems}건`)
})
