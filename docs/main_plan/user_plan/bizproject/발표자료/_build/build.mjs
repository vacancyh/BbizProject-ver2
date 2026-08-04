/**
 * 발표 자료 PDF 빌드 (2026-08-04 신설)
 *
 *   node build.mjs
 *
 * 산출물은 상위 폴더(발표자료/)에 떨어진다.
 * Chromium 은 apps/web 의 @playwright/test 것을 빌려 쓴다 — 별도 설치 불필요.
 */

import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { writeFileSync, existsSync } from "node:fs"
import path from "node:path"

import { DECK, SCRIPT } from "./slides.mjs"
import { buildDeck, buildScriptDoc } from "./render.mjs"

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(HERE, "..")

// ── Chromium 확보: 위로 올라가며 apps/web/node_modules/@playwright/test 를 찾는다
function findPlaywrightBase() {
  let dir = HERE
  for (let i = 0; i < 10; i++) {
    const cand = path.join(dir, "apps", "web", "node_modules", "@playwright", "test")
    if (existsSync(cand)) return path.join(dir, "apps", "web", "package.json")
    const up = path.dirname(dir)
    if (up === dir) break
    dir = up
  }
  throw new Error("@playwright/test 를 찾지 못했습니다. apps/web 에서 pnpm install 을 먼저 하세요.")
}

const require = createRequire(findPlaywrightBase())
const { chromium } = require("@playwright/test")

// ── 렌더 대상 정의 ────────────────────────────────────────────
const W = 1280
const H = 720

const SLIDE_JOBS = [
  {
    file: "발표_전체.pdf",
    html: buildDeck(DECK.sections, {
      title: "발표 슬라이드 (전체)",
      withSectionDividers: true,
      cover: {
        title: DECK.title,
        subtitle: DECK.subtitle,
        meta: `3인 · 20분 · ${DECK.date}\n\n${DECK.sections
          .map((s) => `${s.id}. ${s.title} — ${s.subtitle}`)
          .join("\n")}`,
      },
    }),
  },
  ...DECK.sections.map((sec) => ({
    file: `발표${sec.id}_${sec.title.replace(/\s+/g, "_").replace(/[\\/:*?"<>|]/g, "")}.pdf`,
    html: buildDeck([sec], {
      title: `${sec.presenter} — ${sec.title}`,
      withSectionDividers: false,
      cover: {
        title: sec.title,
        subtitle: sec.subtitle,
        meta: `${sec.presenter} · ${sec.minutes}분\n${DECK.title} — ${DECK.subtitle}`,
      },
    }),
  })),
]

const SCRIPT_HTML = buildScriptDoc(DECK.sections, SCRIPT, {
  title: "발표자 대본",
  subtitle: `${DECK.title} — ${DECK.subtitle} · 3인 · 20분`,
  meta:
    "슬라이드 번호는 발표_전체.pdf 가 아니라 <b>각 발표자 PDF 기준</b>입니다 (표지 다음 장이 1번).\n" +
    "시간은 목표치입니다. 합이 각자 배정 시간보다 짧게 잡혀 있으니 여유분으로 쓰세요.\n" +
    "이 대본은 템플릿입니다 — 본인 말투로 고쳐 쓰는 걸 전제로 썼습니다.",
})

// ── PDF 생성 ─────────────────────────────────────────────────
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: W, height: H } })

for (const job of SLIDE_JOBS) {
  const htmlPath = path.join(HERE, job.file.replace(/\.pdf$/, ".html"))
  writeFileSync(htmlPath, job.html, "utf8")
  await page.goto("file:///" + htmlPath.replace(/\\/g, "/"))
  await page.emulateMedia({ media: "print" })
  await page.pdf({
    path: path.join(OUT, job.file),
    width: `${W}px`,
    height: `${H}px`,
    printBackground: true,
    pageRanges: "",
  })
  console.log("✓", job.file)
}

{
  const htmlPath = path.join(HERE, "발표자대본.html")
  writeFileSync(htmlPath, SCRIPT_HTML, "utf8")
  await page.goto("file:///" + htmlPath.replace(/\\/g, "/"))
  await page.emulateMedia({ media: "print" })
  await page.pdf({
    path: path.join(OUT, "발표자대본.pdf"),
    format: "A4",
    printBackground: true,
  })
  console.log("✓ 발표자대본.pdf")
}

await browser.close()
console.log("\n완료 →", OUT)
