/**
 * 모바일 반응형 검증 (2026-07-28 신규)
 *
 * 지금까지 검증은 데스크톱 1440 뷰포트 뿐이었다. 모바일에서 흔한 실패 모드를 잡는다:
 *  - 가로 스크롤 발생(레이아웃 넘침)
 *  - 모바일 내비(햄버거) 미동작
 *  - 상품 담기 CTA 가 화면 밖/비가시
 */
import { test, expect, Page } from "@playwright/test"

const CC = process.env.STOREFRONT_REGION ?? "kr"

/** 문서 가로 넘침 여부 — 모바일 레이아웃 깨짐의 대표 신호 */
async function hasHorizontalOverflow(page: Page): Promise<{ over: boolean; sw: number; cw: number }> {
  return page.evaluate(() => {
    const sw = document.documentElement.scrollWidth
    const cw = document.documentElement.clientWidth
    return { over: sw > cw + 1, sw, cw }
  })
}

const PAGES = [
  { path: `/${CC}`, label: "홈" },
  { path: `/${CC}/store`, label: "전체상품" },
  { path: `/${CC}/cart`, label: "장바구니" },
  { path: `/${CC}/account`, label: "로그인" },
]

for (const p of PAGES) {
  test(`모바일: ${p.label} 가로 스크롤 없음`, async ({ page }) => {
    await page.goto(p.path)
    await page.waitForLoadState("networkidle").catch(() => {})
    const r = await hasHorizontalOverflow(page)
    console.log(`▶ ${p.label}: scrollWidth=${r.sw} clientWidth=${r.cw}`)
    expect(r.over, `${p.label} 가로 넘침(scrollWidth=${r.sw} > clientWidth=${r.cw})`).toBe(false)
  })
}

test("모바일: 햄버거 메뉴 열림 → 전체상품 이동", async ({ page }) => {
  await page.goto(`/${CC}`)
  await page.waitForLoadState("networkidle").catch(() => {})

  // 홈 팝업 배너가 떠 있으면 화면 전체를 덮어 클릭을 가로챈다 → 먼저 닫는다
  const popup = page.getByTestId("home-popup")
  if (await popup.count()) {
    await page.getByTestId("popup-close").click()
    await expect(popup).toHaveCount(0)
  }

  const menuBtn = page.getByTestId("nav-menu-button")
  await expect(menuBtn).toBeVisible()
  await menuBtn.click()
  const popupPanel = page.getByTestId("nav-menu-popup")
  await expect(popupPanel).toBeVisible()

  // 메뉴 패널 안의 링크에는 testid 가 없으므로 href 로 선택(헤더 뒤편 동명 링크 회피)
  await popupPanel.locator(`a[href="/${CC}/store"]`).first().click()
  await page.waitForURL(`**/${CC}/store`)
  await expect(page.locator('a[href*="/products/"]').first()).toBeVisible()
})

test("모바일: 상품 상세 담기 버튼이 화면 안에 보인다", async ({ page }) => {
  await page.goto(`/${CC}/store`)
  await page.locator('a[href*="/products/"]').first().click()
  await page.waitForURL(`**/${CC}/products/**`)

  const addBtn = page.getByTestId("add-product-button")
  await expect(addBtn).toBeVisible()
  const box = await addBtn.boundingBox()
  const vp = page.viewportSize()
  expect(box, "담기 버튼 박스를 얻지 못함").not.toBeNull()
  expect(box!.x, "담기 버튼이 화면 왼쪽 밖").toBeGreaterThanOrEqual(-1)
  expect(box!.x + box!.width, "담기 버튼이 화면 오른쪽 밖").toBeLessThanOrEqual((vp?.width ?? 390) + 1)
})
