/**
 * 접근성(a11y) 자동 검사 — axe-core (2026-07-28 신규)
 *
 * 지금까지 접근성은 자동/수동 어느 쪽으로도 검증된 적이 없었다.
 * 완벽한 준수를 단번에 달성하긴 어려우므로, **심각(critical/serious) 위반 0** 을 게이트로 삼고
 * moderate/minor 는 로그로 남겨 추이를 본다(회귀 방지 기준선).
 */
import { test, expect } from "@playwright/test"

import { localized } from "./_locale"
import AxeBuilder from "@axe-core/playwright"

const CC = process.env.STOREFRONT_REGION ?? "kr"

/**
 * 언어 지정(2026-08-06). `E2E_LOCALE=en-US` 로 실행하면 **영어 화면의 접근성**을 검사한다.
 * 문구가 바뀌면 대비·라벨·읽기 순서가 달라질 수 있어 언어별로 봐야 한다.
 */
const E2E_LOCALE = process.env.E2E_LOCALE || null
test.beforeEach(async ({ context }) => {
  if (E2E_LOCALE) {
    await context.addCookies([
      { name: "_medusa_locale", value: E2E_LOCALE, url: "http://localhost:8000" },
    ])
  }
})

/**
 * 검사 대상 화면.
 *
 * ⚠️ **상품상세가 빠져 있었다**(2026-08-12 발견). 하필 거기에 CRITICAL 위반이 있었다 —
 * 상세 탭 아코디언 버튼에 접근 가능한 이름이 없어 스크린리더가 "버튼, 접힘" 만 읽었다.
 * 목록에 없는 화면은 영원히 안 잡힌다. 고객이 실제로 머무는 화면은 전부 넣는다.
 */
const PAGES: { path: string; label: string }[] = [
  { path: `/${CC}`, label: "홈" },
  { path: `/${CC}/store`, label: "전체상품" },
  { path: `/${CC}/products/kr-test-p11`, label: "상품상세" },
  { path: `/${CC}/cart`, label: "장바구니" },
  { path: `/${CC}/account`, label: "로그인" },
  { path: `/${CC}/customer-service`, label: "고객센터" },
  { path: `/${CC}/order/lookup`, label: "주문조회" },
  { path: `/${CC}/wishlist`, label: "위시리스트" },
]

for (const p of PAGES) {
  test(`a11y: ${p.label} (${p.path})`, async ({ page }) => {
    await page.goto(localized(p.path, E2E_LOCALE as never))
    await page.waitForLoadState("networkidle").catch(() => {})

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      // Next dev 오버레이(개발 서버 전용 UI)는 검사 대상에서 제외
      .exclude("nextjs-portal")
      .analyze()

    const byImpact = (level: string) => results.violations.filter((v) => v.impact === level)
    // 예전에는 color-contrast 를 "브랜드 색이라 어쩔 수 없다"며 게이트에서 뺐다.
    // 2026-08-12 에 네이버 버튼(#03C75A + 흰 글씨, 2.25:1)을 5.06:1 로 고쳐 해소했으므로
    // 이제 게이트에 포함한다. 면제가 필요한 새 사례가 생기면 **이유와 함께** 여기에 적을 것 —
    // 비워 두면 "왜 빠졌는지" 를 아무도 모르게 된다.
    const GATE_EXCLUDED = new Set<string>()
    const critical = [...byImpact("critical"), ...byImpact("serious")].filter(
      (v) => !GATE_EXCLUDED.has(v.id)
    )
    const minor = [
      ...byImpact("moderate"),
      ...byImpact("minor"),
      ...results.violations.filter((v) => GATE_EXCLUDED.has(v.id)),
    ]

    // 라벨을 impact 등급으로 쓰면 오해가 생긴다 — 면제된 color-contrast 는 impact 가
    // serious 인데도 추적 버킷에 들어가므로, "게이트 위반 / 추적" 으로 표기한다.
    console.log(
      `▶ ${p.label}: 게이트위반=${critical.length}, 추적(면제 포함)=${minor.length}`
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
