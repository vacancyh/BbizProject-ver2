/**
 * 404·오류 화면 검증 (2026-08-12 신설)
 *
 * 이 테스트가 막는 것
 *  · 없는 주소로 들어왔을 때 **Next 기본 "404" 맨 화면**이 나가는 것
 *    (한국어도, 링크도, 헤더도 없다 — 고객은 갈 곳을 잃는다)
 *  · 오류 화면에서 **이동 링크가 사라지는 것**
 *  · 영어로 보고 있는데 오류 화면만 한국어로 나오는 것
 *
 * ── 왜 세그먼트마다 not-found.tsx 가 필요한가 ───────────────────────────────
 * Next 는 `notFound()` 에 대해 **그 세그먼트의** not-found.tsx 만 찾는다.
 * 상위(`(main)/not-found.tsx`)로 올라가지 않는다. 그래서 notFound() 를 부르는
 * 세그먼트에 파일을 빠뜨리면 조용히 기본 404 로 되돌아간다 — 이 테스트가 잡는다.
 */
import { test, expect, type Page } from "@playwright/test"

import { localized, type TestLocale } from "./_locale"

const CC = process.env.E2E_COUNTRY ?? "kr"

/** notFound() 를 부르는(또는 매칭 실패하는) 주소들 */
const NOT_FOUND_PATHS = [
  ["매칭 안 되는 주소", `/${CC}/zzz-no-such-page`],
  ["없는 상품", `/${CC}/products/zzz-no-such-product`],
  ["없는 카테고리", `/${CC}/categories/zzz-no-such-category`],
  ["없는 컬렉션", `/${CC}/collections/zzz-no-such-collection`],
  ["없는 약관 문서", `/${CC}/content/zzz-no-such-doc`],
] as const

/** 언어는 **주소**로 지정한다(2026-08-12) — 쿠키를 심어도 `/kr/...` 은 한국어다. */
async function visit(page: Page, path: string, locale?: TestLocale) {
  return page.goto(localized(path, locale), { waitUntil: "domcontentloaded" })
}

test.describe("404 화면", () => {
  for (const [label, path] of NOT_FOUND_PATHS) {
    test(`${label}: 안내 화면과 이동 링크가 나온다`, async ({ page }) => {
      const res = await visit(page, path)
      expect(res?.status(), "404 상태여야 한다").toBe(404)

      const view = page.getByTestId("not-found-view")
      await expect(view, "공용 404 화면이 아니라 기본 404 가 나왔다").toBeVisible({
        timeout: 30_000,
      })
      // 갈 곳이 없으면 404 는 막다른 길이다 — 링크가 반드시 있어야 한다
      expect(await view.locator("a").count()).toBeGreaterThanOrEqual(2)
    })
  }

  test("영어로 보면 404 도 영어다", async ({ page }) => {
    await visit(page, `/${CC}/products/zzz-no-such-product`, "en-US")
    const view = page.getByTestId("not-found-view")
    await expect(view).toBeVisible({ timeout: 30_000 })
    await expect(view).toContainText("Page not found")

    const hangul = (await view.innerText()).match(/[가-힣]{2,}/g)
    expect(hangul, `영어 404 에 한글 잔존: ${hangul?.join(", ")}`).toBeNull()
  })
})
