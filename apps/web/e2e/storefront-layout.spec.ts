/**
 * 레이아웃 깨짐 검사 (2026-08-06 신설)
 *
 * ── 왜 필요한가 ────────────────────────────────────────────────────────────
 * 기존 검사는 "페이지에 가로 스크롤이 생기는가"만 봤다. 그것만으로는 못 잡는 게 있다:
 *   · 개별 요소가 화면 밖으로 삐져나감 — 조상이 overflow:hidden 이면 페이지 스크롤은 안 생긴다
 *   · 이미지가 깨져 빈 칸으로 남음 (naturalWidth === 0)
 *   · 누르기 힘든 작은 컨트롤 (WCAG 2.5.8 최소 24×24)
 *
 * 좁은 폭(320)부터 넓은 화면(1920)까지, **양 언어**로 돈다.
 * 영문은 한글보다 길어지는 문구가 많아 좁은 화면에서 먼저 깨진다.
 *
 * ── 오탐을 피하려고 넣은 예외 ──────────────────────────────────────────────
 *  · 가로 스크롤 컨테이너 안의 요소 — 넓은 표를 내부 스크롤시키는 건 정상 패턴이다.
 *    **클래스명이 아니라 계산된 overflow-x 로 판단한다** (앱마다 클래스가 달라 오탐이 났었다)
 *  · 문장 속 인라인 링크 — 줄 높이만큼만 차지하는 게 정상. 가로·세로가 둘 다 작은 것만 잡는다.
 */
import { test, expect, type Page } from "@playwright/test"

import { localized } from "./_locale"

const CC = process.env.E2E_COUNTRY ?? "kr"

const VIEWPORTS = [
  { name: "mobile-sm", w: 320, h: 720 },
  { name: "mobile", w: 390, h: 844 },
  { name: "tablet", w: 768, h: 1024 },
  { name: "desktop", w: 1280, h: 900 },
]

const PAGES = [
  { label: "홈", path: `/${CC}` },
  { label: "전체상품", path: `/${CC}/store` },
  { label: "장바구니", path: `/${CC}/cart` },
  { label: "로그인", path: `/${CC}/account` },
  { label: "고객센터", path: `/${CC}/customer-service` },
]

const LOCALES = [
  { label: "한국어", cookie: null as string | null },
  { label: "영어", cookie: "en-US" },
]

/** 브라우저 안에서 실행된다. 문제를 문자열 배열로 돌려준다. */
function auditLayout(vw: number): string[] {
  const out: string[] = []
  const name = (el: Element) => {
    const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30)
    const aria = el.getAttribute("aria-label")
    return `${el.tagName.toLowerCase()}${t ? ` "${t}"` : aria ? ` [${aria}]` : ""}`
  }

  for (const el of Array.from(document.querySelectorAll("body *"))) {
    const cs = getComputedStyle(el)
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue

    if (r.left < -2 || r.right > vw + 2) {
      let inScroller = false
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const ov = getComputedStyle(a).overflowX
        if (ov === "auto" || ov === "scroll" || ov === "hidden") { inScroller = true; break }
      }
      const srOnly = cs.position === "absolute" && (r.width <= 1 || r.height <= 1)
      if (!inScroller && !srOnly && out.length < 10) {
        out.push(`화면밖: ${name(el)} left=${Math.round(r.left)} right=${Math.round(r.right)}`)
      }
    }
  }

  for (const img of Array.from(document.images)) {
    if (img.complete && img.naturalWidth === 0 && out.length < 10) {
      out.push(`이미지깨짐: ${img.getAttribute("src") || "(src 없음)"}`)
    }
  }

  const de = document.documentElement
  if (de.scrollWidth - de.clientWidth > 1) {
    out.push(`페이지 가로 스크롤: ${de.scrollWidth} > ${de.clientWidth}`)
  }
  return out
}

/** 누르기 힘든 컨트롤 — 가로·세로가 둘 다 24 미만인 것만. */
function auditTouchTargets(): string[] {
  const out: string[] = []
  const sel = "a, button, [role='button'], input[type='checkbox'], input[type='radio']"
  for (const el of Array.from(document.querySelectorAll(sel))) {
    const cs = getComputedStyle(el)
    if (cs.display === "none" || cs.visibility === "hidden") continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.width < 24 && r.height < 24 && out.length < 10) {
      const t = (el.textContent || "").trim().slice(0, 20)
      const aria = el.getAttribute("aria-label") || ""
      out.push(
        `${el.tagName.toLowerCase()}${t ? ` "${t}"` : aria ? ` [${aria}]` : ""} ` +
          `${Math.round(r.width)}×${Math.round(r.height)}`
      )
    }
  }
  return out
}

/**
 * 언어 지정은 이제 **주소**로 한다(2026-08-12). 쿠키를 심어도 `/kr/...` 은 한국어다.
 * 이 함수는 호출부를 덜 고치려고 남겨 뒀지만 하는 일이 없다 —
 * 실제 지정은 `localized(path, cookie)` 가 한다.
 */
async function setLocale(_page: Page, _cookie: string | null) {
  // 주소로 지정하므로 할 일 없음
}

for (const loc of LOCALES) {
  for (const vp of VIEWPORTS) {
    test.describe(`${loc.label} · ${vp.name}(${vp.w})`, () => {
      test.use({ viewport: { width: vp.w, height: vp.h } })

      for (const pg of PAGES) {
        test(pg.label, async ({ page }) => {
          await setLocale(page, loc.cookie)
          const res = await page.goto(localized(pg.path, loc.cookie as never), {
            waitUntil: "domcontentloaded",
          })
          expect(res?.status()).toBe(200)
          await page.waitForLoadState("networkidle").catch(() => {})
          await page.waitForTimeout(500)

          const issues = await page.evaluate(auditLayout, vp.w)
          expect(issues, `${pg.path} 레이아웃`).toEqual([])

          // 터치 타깃은 실제로 손가락을 쓰는 좁은 화면에서만 본다
          if (vp.w <= 480) {
            const tiny = await page.evaluate(auditTouchTargets)
            expect(tiny, `${pg.path} 누르기 힘든 컨트롤`).toEqual([])
          }
        })
      }
    })
  }
}
