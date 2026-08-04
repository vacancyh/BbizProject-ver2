/**
 * 성능 스모크 + 동시 부하 (2026-07-28)
 * 목적: 판매 상황에서 느리거나 무너지는 지점이 있는지 본다. 절대 성능이 아니라 "이상 징후" 탐지.
 */
const BASE = process.env.BASE || "http://localhost:9000"
const WEB = process.env.WEB || "http://localhost:8000"
const PUB = process.env.PUBKEY

const h = { "x-publishable-api-key": PUB }

async function timeIt(label, fn, n = 5) {
  const ts = []
  for (let i = 0; i < n; i++) {
    const t0 = Date.now()
    await fn()
    ts.push(Date.now() - t0)
  }
  ts.sort((a, b) => a - b)
  const med = ts[Math.floor(n / 2)]
  const max = ts[n - 1]
  const mark = med > 2000 ? "🔴" : med > 800 ? "🟡" : "🟢"
  console.log(`${mark} ${label.padEnd(38)} 중앙 ${String(med).padStart(5)}ms  최대 ${String(max).padStart(5)}ms`)
  return { label, med, max }
}

const get = (p, opts = {}) => fetch(BASE + p, { headers: h, ...opts })

const run = async () => {
  console.log("\n── API 응답시간 (중앙값 기준) ──────────────────────────")
  const rows = []
  rows.push(await timeIt("상품 목록 20건", () => get("/store/products?limit=20")))
  rows.push(await timeIt("상품 목록 + 가격필드", () => get("/store/products?limit=20&fields=*variants.calculated_price")))
  rows.push(await timeIt("베스트 상품(집계)", () => get("/store/best-products?limit=10")))
  rows.push(await timeIt("검색(키워드)", () => get("/store/products?q=티셔츠&limit=20")))
  rows.push(await timeIt("타임세일", () => get("/store/time-sales")))
  rows.push(await timeIt("배너/공지/FAQ", async () => {
    await Promise.all([get("/store/banners"), get("/store/notices"), get("/store/faqs")])
  }))

  console.log("\n── 화면(SSR) 응답시간 ─────────────────────────────────")
  rows.push(await timeIt("홈 페이지", () => fetch(`${WEB}/kr`), 3))
  rows.push(await timeIt("상품 목록 페이지", () => fetch(`${WEB}/kr/store`), 3))

  console.log("\n── 동시 부하(같은 요청 30건 동시) ─────────────────────")
  for (const [label, path] of [["상품 목록", "/store/products?limit=20"], ["베스트", "/store/best-products?limit=10"]]) {
    const t0 = Date.now()
    const res = await Promise.all(Array.from({ length: 30 }, () => get(path)))
    const ms = Date.now() - t0
    const ok = res.filter((r) => r.status === 200).length
    const limited = res.filter((r) => r.status === 429).length
    const err = res.filter((r) => r.status >= 500).length
    console.log(`   ${label}: 30건 ${ms}ms · 200=${ok} 429=${limited} 5xx=${err} ${err === 0 ? "✅" : "❌ 서버 오류"}`)
  }

  console.log("\n── 요약 ───────────────────────────────────────────────")
  const slow = rows.filter((r) => r.med > 800)
  if (slow.length === 0) console.log("   ✅ 800ms 초과 구간 없음")
  else slow.forEach((s) => console.log(`   ⚠️  ${s.label}: 중앙 ${s.med}ms — 개선 검토 대상`))
}

run().catch((e) => { console.error(e); process.exit(1) })
