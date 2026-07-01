/** 스토어프론트 전 페이지 크롤 — 콘솔에러/pageerror/4xx·5xx/깨진이미지 수집(다각 검증) */
import { test, expect } from "@playwright/test"

const PUBLIC = [
  "/kr", "/kr/store", "/kr/store?sortBy=price_asc", "/kr/store?sortBy=created_at",
  "/kr/products/t-shirt", "/kr/products/sweatshirt", "/kr/products/sweatpants",
  "/kr/products/shorts", "/kr/products/kr-test-p1", "/kr/products/kr-test-p4",
  "/kr/categories/shirts", "/kr/categories/pants",
  "/kr/collections/best", "/kr/collections/new",
  "/kr/cart", "/kr/customer-service", "/kr/order/lookup", "/kr/reset-password",
  "/kr/content/terms-of-use", "/kr/content/privacy-policy",
]
const ACCOUNT = [
  "/kr/account", "/kr/account/orders", "/kr/account/profile", "/kr/account/addresses",
  "/kr/account/points", "/kr/account/membership", "/kr/account/coupons",
  "/kr/account/consents", "/kr/wishlist",
]

const IGNORE = /favicon|hot-update|__nextjs|_next\/static\/.*\.js|analytics|gtag|beacon/i

test("전 페이지 무결성 크롤(콘솔/네트워크/이미지)", async ({ page }) => {
  test.setTimeout(300000)
  const report: Record<string, any> = {}
  let cur = ""
  const con: string[] = [], perr: string[] = [], net: string[] = []
  page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) con.push(`[${cur}] ${m.text().slice(0,140)}`) })
  page.on("pageerror", (e) => perr.push(`[${cur}] ${e.message.slice(0,140)}`))
  page.on("response", (r) => { const s = r.status(); if (s >= 400 && !IGNORE.test(r.url())) net.push(`[${cur}] ${s} ${r.url().replace("http://localhost:8000","").slice(0,90)}`) })

  async function crawl(routes: string[]) {
    for (const r of routes) {
      cur = r
      await page.goto(r, { waitUntil: "networkidle" }).catch(() => {})
      const close = page.getByTestId("popup-close"); if (await close.count()) await close.click().catch(()=>{})
      await page.waitForTimeout(700)
      // 깨진 이미지: 로드완료 + naturalWidth==0
      const broken = await page.evaluate(() =>
        Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc || i.src).slice(0,5)
      ).catch(() => [])
      if (broken.length) report[r] = { ...(report[r]||{}), brokenImg: broken }
    }
  }

  await crawl(PUBLIC)
  // 로그인(gold@ — 데이터 풍부) 후 계정 페이지 크롤
  await page.goto("/kr/account", { waitUntil: "domcontentloaded" })
  if (await page.getByTestId("email-input").count()) {
    await page.getByTestId("email-input").fill("gold@kr-demo.local")
    await page.getByTestId("password-input").fill("test1234!")
    await page.getByTestId("sign-in-button").click()
    await page.getByTestId("welcome-message").waitFor({ timeout: 20000 }).catch(()=>{})
  }
  await crawl(ACCOUNT)

  console.log("\n===== 크롤 결과 =====")
  console.log("방문 페이지:", PUBLIC.length + ACCOUNT.length)
  console.log("pageerror:", perr.length); perr.slice(0,10).forEach(e=>console.log("  ✗",e))
  console.log("console.error:", con.length); con.slice(0,15).forEach(e=>console.log("  ⚠",e))
  console.log("4xx/5xx 응답:", net.length); [...new Set(net)].slice(0,20).forEach(e=>console.log("  •",e))
  console.log("깨진 이미지 페이지:", Object.keys(report).length); Object.entries(report).forEach(([k,v])=>console.log("  🖼",k,JSON.stringify(v)))
  console.log("=====================\n")
  // pageerror(런타임 예외)만 하드 실패, 나머지는 리포트
  expect(perr, perr.join("\n")).toHaveLength(0)
})
