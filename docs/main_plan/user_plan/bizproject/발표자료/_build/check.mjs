/**
 * 슬라이드 넘침 검사 (2026-08-04 신설)
 *
 * PDF 는 넘쳐도 조용히 잘려 나가므로 눈으로만 보면 놓친다.
 * 각 슬라이드의 실제 내용 높이가 720px 안에 들어가는지 기계로 확인한다.
 *
 *   node check.mjs            검사만
 *   node check.mjs --shot     넘친 장을 PNG 로도 뽑는다
 */

import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { existsSync, readdirSync } from "node:fs"
import path from "node:path"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SHOT = process.argv.includes("--shot")

function findPlaywrightBase() {
  let dir = HERE
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(dir, "apps", "web", "node_modules", "@playwright", "test"))) {
      return path.join(dir, "apps", "web", "package.json")
    }
    const up = path.dirname(dir)
    if (up === dir) break
    dir = up
  }
  throw new Error("@playwright/test 를 찾지 못했습니다.")
}
const { chromium } = createRequire(findPlaywrightBase())("@playwright/test")

const files = readdirSync(HERE).filter((f) => f.endsWith(".html") && f !== "발표자대본.html")

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
let bad = 0

for (const file of files) {
  await page.goto("file:///" + path.join(HERE, file).replace(/\\/g, "/"))
  await page.emulateMedia({ media: "print" })

  const issues = await page.evaluate(() => {
    const out = []
    document.querySelectorAll(".slide").forEach((el, i) => {
      // 하단 러너(bottom 28px + 글자높이)를 침범하면 겹쳐 보인다
      const FOOT_ZONE = 720 - 56
      let maxBottom = 0
      el.querySelectorAll(".body, .btext, .bsub, .ctitle, .csub, .cmeta, .stt, .sss, .stime").forEach((c) => {
        if (c.classList.contains("body")) {
          c.querySelectorAll(":scope > *").forEach((g) => {
            maxBottom = Math.max(maxBottom, g.getBoundingClientRect().bottom - el.getBoundingClientRect().top)
          })
        } else {
          maxBottom = Math.max(maxBottom, c.getBoundingClientRect().bottom - el.getBoundingClientRect().top)
        }
      })
      const title = el.querySelector(".stitle, .btext, .ctitle, .stt")?.textContent?.trim().slice(0, 34) || "(무제)"
      if (maxBottom > FOOT_ZONE) {
        out.push({ i: i + 1, title, bottom: Math.round(maxBottom), limit: FOOT_ZONE })
      }
    })
    return out
  })

  if (issues.length) {
    bad += issues.length
    console.log(`\n✗ ${file}`)
    for (const s of issues) {
      console.log(`   p${s.i}  ${s.title}  →  ${s.bottom}px (한계 ${s.limit}px, ${s.bottom - s.limit}px 초과)`)
      if (SHOT) {
        const el = page.locator(".slide").nth(s.i - 1)
        await el.screenshot({ path: path.join(HERE, `_over_${file.replace(".html", "")}_p${s.i}.png`) })
      }
    }
  } else {
    console.log(`✓ ${file}`)
  }
}

await browser.close()
console.log(bad ? `\n총 ${bad}장 넘침` : "\n전 슬라이드 정상")
process.exit(bad ? 1 : 0)
