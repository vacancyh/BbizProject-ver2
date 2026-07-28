/**
 * 접근성(a11y) 자동 검사 — axe-core (2026-07-28 신규)
 *
 * 지금까지 접근성은 자동/수동 어느 쪽으로도 검증된 적이 없었다.
 * 완벽한 준수를 단번에 달성하긴 어려우므로, **심각(critical/serious) 위반 0** 을 게이트로 삼고
 * moderate/minor 는 로그로 남겨 추이를 본다(회귀 방지 기준선).
 */
import { test, expect } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

const CC = process.env.STOREFRONT_REGION ?? "kr"

const PAGES: { path: string; label: string }[] = [
  { path: `/${CC}`, label: "홈" },
  { path: `/${CC}/store`, label: "전체상품" },
  { path: `/${CC}/cart`, label: "장바구니" },
  { path: `/${CC}/account`, label: "로그인" },
  { path: `/${CC}/customer-service`, label: "고객센터" },
]

for (const p of PAGES) {
  test(`a11y: ${p.label} (${p.path})`, async ({ page }) => {
    await page.goto(p.path)
    await page.waitForLoadState("networkidle").catch(() => {})

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Next dev 오버레이(개발 서버 전용 UI)는 검사 대상에서 제외
      .exclude("nextjs-portal")
      .analyze()

    const byImpact = (level: string) => results.violations.filter((v) => v.impact === level)
    // color-contrast 는 디자인 토큰(ui-fg-interactive)·브랜드 색(네이버 #03C75A) 문제라
    // 코드 수정이 아닌 디자인 결정이 필요 → 게이트에서 제외하고 로그로 추적한다.
    const GATE_EXCLUDED = new Set(["color-contrast"])
    const critical = [...byImpact("critical"), ...byImpact("serious")].filter(
      (v) => !GATE_EXCLUDED.has(v.id)
    )
    const minor = [
      ...byImpact("moderate"),
      ...byImpact("minor"),
      ...results.violations.filter((v) => GATE_EXCLUDED.has(v.id)),
    ]

    console.log(
      `▶ ${p.label}: critical/serious=${critical.length}, moderate/minor=${minor.length}`
    )
    for (const v of [...critical, ...minor]) {
      console.log(`   [${v.impact}] ${v.id} — ${v.help} (${v.nodes.length}곳)`)
      for (const n of v.nodes.slice(0, 3)) {
        console.log(`       ${n.target.join(" ")}  ::  ${n.html.slice(0, 120)}`)
      }
    }

    expect(
      critical,
      critical.map((v) => `${v.id}: ${v.help}`).join("\n")
    ).toHaveLength(0)
  })
}
