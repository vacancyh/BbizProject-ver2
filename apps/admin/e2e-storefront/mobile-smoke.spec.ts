/** 모바일 반응형 스모크 — iPhone 뷰포트에서 주요 화면 렌더/가로오버플로/에러 점검 */
import { test, expect } from "@playwright/test"
test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })

const ROUTES = ["/kr","/kr/store","/kr/products/t-shirt","/kr/cart","/kr/account","/kr/customer-service","/kr/order/lookup"]

test("모바일 주요 화면 스모크", async ({ page }) => {
  test.setTimeout(150000)
  const issues: string[] = []
  page.on("pageerror", e => issues.push(`pageerror @${page.url()}: ${e.message.slice(0,80)}`))
  for (const r of ROUTES) {
    await page.goto(r, { waitUntil: "networkidle" }).catch(()=>{})
    const close = page.getByTestId("popup-close"); if (await close.count()) await close.click().catch(()=>{})
    await page.waitForTimeout(500)
    // 가로 오버플로(내용이 뷰포트보다 넓으면 좌우 스크롤 발생 = 반응형 깨짐)
    const overflow = await page.evaluate(() => {
      const de = document.documentElement
      return { sw: de.scrollWidth, cw: de.clientWidth }
    })
    if (overflow.sw > overflow.cw + 2) issues.push(`가로오버플로 @${r}: scrollW=${overflow.sw} > clientW=${overflow.cw}`)
    // 본문 렌더 확인
    const bodyLen = (await page.locator("body").innerText().catch(()=>"")).length
    if (bodyLen < 30) issues.push(`빈화면 @${r}`)
    await page.screenshot({ path: `test-results/storefront/mobile_${r.replace(/\//g,"_")}.png` }).catch(()=>{})
  }
  // 모바일 GNB 메뉴 열기 동작
  await page.goto("/kr", { waitUntil: "networkidle" })
  const close = page.getByTestId("popup-close"); if (await close.count()) await close.click().catch(()=>{})
  const menuBtn = page.getByTestId("nav-menu-button")
  if (await menuBtn.count()) { await menuBtn.click().catch(()=>{}); await expect(page.getByTestId("nav-menu-popup")).toBeVisible({ timeout: 8000 }).catch(()=>issues.push("모바일 메뉴 안열림")) }

  console.log("\n===== 모바일 스모크 =====")
  console.log("점검 화면:", ROUTES.length, "| 이슈:", issues.length)
  issues.forEach(i => console.log("  ⚠", i))
  console.log("=========================")
  expect(issues, issues.join("\n")).toHaveLength(0)
})
