/** 어드민 사이드바 전 메뉴 클릭 네비게이션 — 클릭→이동(waitForURL)→렌더→무에러 */
import { test, expect } from "@playwright/test"

test("사이드바 모든 메뉴 클릭 이동 + 에러 0", async ({ page }) => {
  // 예산 근거(2026-08-05 실측): 메뉴 30개를 **차갑게** 도는 데 269초가 걸렸다.
  // Next.js dev 는 라우트마다 첫 진입에서 8~13초를 컴파일에 쓴다.
  // 200초로 잡아두면 `.next` 가 데워져 있을 때만 통과하는 **환경 의존 테스트**가 된다
  // (실제로 프로덕션 빌드 후 dev 를 재기동하자 캐시가 비면서 실패했다).
  // 컴파일 비용은 제품 문제가 아니므로, 차가운 상태에서도 돌 만큼 여유를 준다.
  test.setTimeout(420000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push("pageerror:" + e.message))
  page.on("console", (m) => { if (m.type() === "error") errors.push("console:" + m.text().slice(0,100)) })

  await page.goto("/dashboard", { waitUntil: "networkidle" })
  const hrefs = await page.$$eval('aside a[href^="/"]', (els) =>
    Array.from(new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute("href")!)))
  )
  expect(hrefs.length).toBeGreaterThan(15)

  const fail: string[] = []
  for (const href of hrefs) {
    const before = errors.length
    // 항상 대시보드에서 출발(사이드바 항상 보임)
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" })
    const link = page.locator(`aside a[href="${href}"]`).first()
    if (!(await link.count())) { fail.push(`링크없음:${href}`); continue }
    await link.click()
    try {
      await page.waitForURL((u) => u.pathname.startsWith(href.split("?")[0]), { timeout: 12000 })
    } catch { fail.push(`이동실패:${href}->${new URL(page.url()).pathname}`); continue }
    await page.waitForLoadState("networkidle").catch(() => {})
    // 데이터 로딩이 늦은 화면(예: /categories)이 순간 측정에서 빈 화면으로 오판되지 않도록 폴링
    let bodyLen = 0
    for (let i = 0; i < 20; i++) {
      bodyLen = (await page.locator("main, .scr").first().innerText().catch(() => "")).length
      if (bodyLen >= 20) break
      await page.waitForTimeout(500)
    }
    if (bodyLen < 20) fail.push(`빈화면:${href}`)
    if (await page.getByText("Unhandled Runtime Error").count()) fail.push(`오버레이:${href}`)
    if (errors.length > before) fail.push(`에러@${href}:${errors.slice(before)[0]}`)
  }
  console.log(`\n클릭 메뉴 ${hrefs.length}개 / 실패 ${fail.length}`)
  if (fail.length) console.log(JSON.stringify(fail, null, 1))
  expect(fail, fail.join("\n")).toHaveLength(0)
})
