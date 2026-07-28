/**
 * 전 관리자 화면 헬스 스윕 (기존 flow 테스트와 다른 방식)
 * - 모든 메뉴 화면을 실제 브라우저로 진입
 * - 수집: 콘솔 에러 / 런타임 예외(pageerror) / 4xx·5xx 응답 / 렌더 여부 / Next 에러 오버레이
 * - 전 화면 풀페이지 스크린샷 저장(test-results/sweep)
 * - 하드 실패: 런타임 예외 · 에러 오버레이 · 빈 화면 · 5xx · 관리자 API 403
 */
import { test, expect } from "@playwright/test"
import path from "path"

type Route = { path: string; label: string; mustContain?: RegExp }

const ROUTES: Route[] = [
  { path: "/dashboard", label: "대시보드" },
  { path: "/products", label: "상품목록", mustContain: /상품/ },
  { path: "/categories", label: "카테고리" },
  { path: "/product-types", label: "상품유형" },
  { path: "/product-curation", label: "큐레이션" },
  { path: "/orders", label: "주문관리", mustContain: /주문/ },
  { path: "/shipping", label: "배송관리" },
  { path: "/reviews", label: "리뷰/문의" },
  { path: "/members", label: "회원관리", mustContain: /회원|이메일/ },
  { path: "/customer-groups", label: "고객그룹" },
  { path: "/coupons", label: "쿠폰" },
  { path: "/marketing", label: "마케팅" },
  { path: "/time-sales", label: "타임세일" },
  { path: "/settlement", label: "정산" },
  { path: "/stats", label: "통계" },
  { path: "/warehouse", label: "창고/재고" },
  { path: "/shipping-policy", label: "배송정책" },
  { path: "/api-keys", label: "API키" },
  { path: "/audit-logs", label: "감사로그(super)" },
  { path: "/permissions", label: "권한(super)" },
  { path: "/policies", label: "정책(super)" },
  { path: "/settings", label: "설정" },
  { path: "/settings/channels", label: "설정-판매채널" },
  { path: "/settings/legal-docs", label: "설정-약관문서" },
  { path: "/settings/maintenance", label: "설정-점검모드" },
  { path: "/settings/reasons", label: "설정-사유관리" },
  { path: "/settings/workflow-logs", label: "설정-워크플로우로그" },
  // 2026-07-28 추가 — 스윕 목록에서 누락돼 있던 화면(cms/보안)
  { path: "/settings/customer-service", label: "설정-고객센터콘텐츠" },
  { path: "/settings/banners", label: "설정-배너·팝업" },
  { path: "/settings/home-curation", label: "설정-홈큐레이션" },
  { path: "/settings/security", label: "설정-보안(2FA)" },
]

const SHOT_DIR = path.resolve(__dirname, "../test-results/sweep")

// 무해한 콘솔 에러 패턴(노이즈) — 필요시 보강
const BENIGN = [
  /favicon/i,
  /Download the React DevTools/i,
  /Each child in a list should have a unique "key"/i, // 경고성(있으면 별도 리포트)
]

for (const r of ROUTES) {
  test(`화면: ${r.label} (${r.path})`, async ({ page }, testInfo) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    const badResponses: string[] = []

    page.on("console", (m) => {
      if (m.type() === "error") {
        const t = m.text()
        if (!BENIGN.some((re) => re.test(t))) consoleErrors.push(t)
      }
    })
    page.on("pageerror", (e) => pageErrors.push(e.message))
    page.on("response", (res) => {
      const s = res.status()
      const u = res.url()
      if (s >= 400 && (u.includes("/admin") || u.includes(":9000"))) {
        badResponses.push(`${s} ${res.request().method()} ${u.replace(/^https?:\/\/[^/]+/, "")}`)
      }
    })

    const resp = await page.goto(r.path, { waitUntil: "domcontentloaded", timeout: 30000 })
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1500) // 클라이언트 렌더 안정화

    const status = resp?.status() ?? 0
    const finalUrl = page.url()
    // 실제 에러 오버레이만 탐지 (nextjs-portal 은 dev 모드에서 항상 존재 → 텍스트로 판별)
    const overlay = await page
      .getByText(/Unhandled Runtime Error|Build Error|Failed to compile|Application error/i)
      .count()
      .catch(() => 0)
    const bodyText = ((await page.locator("body").innerText().catch(() => "")) || "").trim()

    // 데이터 비어있음 신호 (위와 같은 '데이터 없음' 화면 탐지용)
    const tableRows = await page.locator("tbody tr").count().catch(() => 0)
    const emptyState = await page
      .getByText(/없습니다|데이터가 없|등록된[^\n]{0,12}없|결과가 없|항목이 없/)
      .count()
      .catch(() => 0)

    await page.screenshot({
      path: path.join(SHOT_DIR, `${r.path.replace(/\//g, "_").replace(/^_/, "")}.png`),
      fullPage: true,
    })

    const server5xx = badResponses.filter((b) => /^5\d\d/.test(b))
    const forbidden = badResponses.filter((b) => /^403/.test(b))
    const notFound = badResponses.filter((b) => /^404/.test(b))

    // 리포트(통과/실패 무관 항상 출력)
    console.log(
      [
        `\n▶ ${r.label} ${r.path} → HTTP ${status} | final ${finalUrl.replace("http://localhost:7002", "")}`,
        `   bodyLen=${bodyText.length} rows=${tableRows} emptyState=${emptyState} overlay=${overlay} pageErr=${pageErrors.length} consoleErr=${consoleErrors.length} bad=${badResponses.length}`,
        tableRows === 0 && emptyState > 0 ? `   📭 데이터 없음(빈 화면) — 시드 검토 필요` : "",
        pageErrors.length ? `   ⛔ pageError: ${pageErrors.slice(0, 3).join(" | ")}` : "",
        server5xx.length ? `   ⛔ 5xx: ${server5xx.slice(0, 5).join(" ; ")}` : "",
        forbidden.length ? `   ⚠ 403: ${forbidden.slice(0, 5).join(" ; ")}` : "",
        notFound.length ? `   ⚠ 404: ${notFound.slice(0, 5).join(" ; ")}` : "",
        consoleErrors.length ? `   ⚠ console: ${consoleErrors.slice(0, 3).join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )

    // 하드 실패 기준
    expect(pageErrors, `런타임 예외 @ ${r.path}`).toHaveLength(0)
    expect(overlay, `Next 에러 오버레이 @ ${r.path}`).toBe(0)
    expect(bodyText.length, `빈 화면 @ ${r.path}`).toBeGreaterThan(40)
    expect(finalUrl, `로그인으로 튕김(인증/권한) @ ${r.path}`).not.toContain("/login")
    expect(server5xx, `5xx @ ${r.path}: ${server5xx.join(", ")}`).toHaveLength(0)
    expect(forbidden, `403 @ ${r.path}: ${forbidden.join(", ")}`).toHaveLength(0)
    if (r.mustContain) {
      expect(bodyText, `핵심 텍스트 누락 @ ${r.path}`).toMatch(r.mustContain)
    }
  })
}
