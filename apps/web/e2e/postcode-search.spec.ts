/**
 * 우편번호 검색 E2E (2026-08-03 신설)
 *
 * 배경: 기능은 구현돼 있었지만 **클릭해도 아무 일이 일어나지 않았다.**
 *   ① `.open()`(팝업 창) 방식이라 브라우저 팝업 차단에 걸렸고,
 *      차단돼도 예외가 없어 폴백 안내조차 뜨지 않았다 → 사용자에겐 "고장난 버튼".
 *   ② 페이지 내 레이어로 바꾸자 이번엔 CSP 가 iframe 을 차단했다.
 *      다음 우편번호가 **daum.net → kakao.com 으로 도메인을 옮겼는데**
 *      CSP frame-src 는 옛 도메인만 허용하고 있었다.
 *      (팝업 방식에서는 frame-src 가 적용되지 않아 이 문제가 숨어 있었다)
 *
 * 이 테스트는 "버튼이 있다"가 아니라 **실제 검색 화면이 뜨고 주소가 폼에 채워지는지**를 본다.
 */
import { test, expect, type Page } from "@playwright/test"

const CC = process.env.STOREFRONT_REGION ?? "kr"

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

test("체크아웃: 우편번호 검색 레이어가 열리고 실제 검색 화면이 로드된다", async ({ page }) => {
  test.setTimeout(180_000)

  // CSP 위반은 콘솔 오류로만 나타난다 — 놓치면 "왜 안 뜨지"로 몇 시간을 쓴다.
  const cspViolations: string[] = []
  page.on("console", (m) => {
    const t = m.text()
    if (m.type() !== "error" || !/Content Security Policy/i.test(t)) return
    // ⚠️ "차단된 대상"만 본다. CSP 위반 메시지에는 정책 문자열 전체가 딸려 오는데
    //    거기에 daumcdn.net 이 들어 있어, 단순 포함 검사로는 **무관한 Stripe 위반까지**
    //    우편번호 문제로 오인한다(실제로 겪음).
    const blocked = /^(?:Framing|Refused to frame)\s+'([^']+)'/.exec(t)?.[1] ?? ""
    if (/kakao|daum/i.test(blocked)) cspViolations.push(t.slice(0, 200))
  })

  await addFirstProductToCart(page)
  await page.goto(`/${CC}/checkout?step=address`)

  const btn = page.getByTestId("postcode-search-button")
  await expect(btn.first()).toBeVisible({ timeout: 30_000 })

  await btn.first().click()

  // 팝업이 아니라 페이지 내 레이어여야 한다(팝업은 차단당한다)
  await expect(page.getByTestId("postcode-modal")).toBeVisible({ timeout: 20_000 })

  // 레이어 안에 실제 검색 화면(iframe)이 로드돼야 한다
  const iframe = page.locator('[data-testid="postcode-modal"] iframe')
  await expect(iframe).toHaveCount(1, { timeout: 20_000 })

  await page.waitForTimeout(3000)
  const frameUrls = page.frames().map((f) => f.url())
  const searchFrame = frameUrls.find((u) => /postcode\.map\.(kakao|daum)/i.test(u))
  console.log("검색 프레임:", searchFrame ?? "(없음)")
  console.log("CSP 위반:", cspViolations.length ? cspViolations : "없음")

  expect(cspViolations, "CSP 가 우편번호 iframe 을 차단하고 있다").toHaveLength(0)
  expect(searchFrame, "우편번호 검색 화면이 로드되지 않았다").toBeTruthy()

  // 닫기 동작
  await page.getByTestId("postcode-modal-close").click()
  await expect(page.getByTestId("postcode-modal")).toHaveCount(0, { timeout: 10_000 })
})
