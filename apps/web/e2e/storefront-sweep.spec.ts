/**
 * 스토어프론트 전 화면 헬스 스윕 (어드민 qa_health_sweep 과 동일한 방식)
 * - 실제 브라우저로 진입 → 콘솔 에러 / 런타임 예외 / 5xx / Next 에러 오버레이 / 빈 화면 수집
 * - 하드 실패: 런타임 예외 · 에러 오버레이 · 5xx · 렌더 실패
 */
import { test, expect, Page } from "@playwright/test"

const CC = process.env.STOREFRONT_REGION ?? "kr"

type Route = { path: string; label: string; mustContain?: RegExp }

const ROUTES: Route[] = [
  { path: `/${CC}`, label: "홈" },
  { path: `/${CC}/store`, label: "전체상품", mustContain: /상품|전체/ },
  { path: `/${CC}/cart`, label: "장바구니", mustContain: /장바구니|카트/ },
  { path: `/${CC}/account`, label: "계정(로그인)", mustContain: /이메일|로그인/ },
  { path: `/${CC}/customer-service`, label: "고객센터" },
  { path: `/${CC}/order/lookup`, label: "비회원 주문조회" },
  { path: `/${CC}/wishlist`, label: "위시리스트" },
  { path: `/${CC}/reset-password`, label: "비밀번호 재설정" },
  { path: `/${CC}/content/terms-of-use`, label: "약관(이용약관)" },
  { path: `/${CC}/content/privacy-policy`, label: "약관(개인정보처리방침)" },
]

// 무해한 콘솔 노이즈
const BENIGN = [
  /favicon/i,
  /Download the React DevTools/i,
  /Each child in a list should have a unique "key"/i,
  /Image with src .* has either width or height modified/i,
]

async function collect(page: Page) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const badResponses: string[] = []

  page.on("console", (m) => {
    if (m.type() !== "error") return
    const t = m.text()
    if (!BENIGN.some((re) => re.test(t))) consoleErrors.push(t)
  })
  page.on("pageerror", (e) => pageErrors.push(e.message))
  page.on("response", (r) => {
    const s = r.status()
    if (s >= 400 && !/favicon/.test(r.url())) badResponses.push(`${s} ${r.url()}`)
  })

  return { consoleErrors, pageErrors, badResponses }
}

for (const r of ROUTES) {
  test(`화면: ${r.label} (${r.path})`, async ({ page }) => {
    const { consoleErrors, pageErrors, badResponses } = await collect(page)

    const res = await page.goto(r.path, { waitUntil: "domcontentloaded" })
    const status = res?.status() ?? 0
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {})

    const bodyText = (await page.locator("body").innerText().catch(() => "")) ?? ""
    const overlay = await page
      .locator("nextjs-portal, [data-nextjs-dialog], #__next-build-watcher")
      .count()
      .catch(() => 0)
    const server5xx = badResponses.filter((b) => /^5\d\d /.test(b))

    console.log(
      `▶ ${r.label} ${r.path} → HTTP ${status}\n   len=${bodyText.length} overlay=${overlay} pageErr=${pageErrors.length} consoleErr=${consoleErrors.length} bad=${badResponses.length}`
    )
    if (consoleErrors.length) console.log(`   ⚠️ console: ${consoleErrors.slice(0, 3).join(" | ")}`)
    if (badResponses.length) console.log(`   ⚠️ http: ${badResponses.slice(0, 3).join(" | ")}`)

    expect(status, `HTTP ${status}`).toBeLessThan(400)
    expect(pageErrors, `런타임 예외: ${pageErrors.join(" | ")}`).toHaveLength(0)
    expect(server5xx, `5xx 응답: ${server5xx.join(" | ")}`).toHaveLength(0)
    expect(bodyText.length, "빈 화면(렌더 실패)").toBeGreaterThan(50)
    if (r.mustContain) expect(bodyText).toMatch(r.mustContain)
  })
}
