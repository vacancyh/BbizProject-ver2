/**
 * 레이트리밋 우회 프로브 (2026-08-04)
 *
 * ── 무엇을 확인하나 ────────────────────────────────────────────────
 * IP 기준 레이트리밋의 버킷 키를 **요청자가 갈아치울 수 있는지** 본다.
 *
 * 2026-08-04 점검에서 실제로 뚫렸다. 원인이 두 겹이었다:
 *   ① 미들웨어가 `X-Forwarded-For` 의 맨 앞 값을 클라이언트 IP 로 신뢰했다.
 *   ② 그걸 고쳐도 `req.ip` 를 쓰면 소용없었다 — Medusa 가 `trust proxy: 1` 을
 *      무조건 켜서 Express 의 `req.ip` 자체가 XFF 에서 값을 뽑아 오기 때문이다.
 * → 신뢰 홉(`TRUSTED_PROXY_HOPS`) 기준으로 XFF 를 오른쪽에서 읽고,
 *   홉이 0이면 소켓 주소만 쓰도록 고쳤다(`api/_utils/client-ip.ts`).
 *
 * ── 판정 방식 ──────────────────────────────────────────────────────
 * 먼저 버킷을 **일부러 한도까지 채운 뒤**, 헤더만 바꿔서 더 보낸다.
 * 이때 하나라도 통과하면 = 새 버킷이 생겼다 = 우회 성공이다.
 * (헤더를 바꿔도 전부 429 여야 정상)
 *
 * ── 실행 ───────────────────────────────────────────────────────────
 *   node audit4-ratelimit-probe.mjs
 *   BACKEND_URL=http://localhost:9000 MEDUSA_PUBLISHABLE_KEY=pk_... node audit4-ratelimit-probe.mjs
 *
 * ── 안전성 ─────────────────────────────────────────────────────────
 * 존재하지 않는 주문 조회와 목록 조회만 보낸다. 주문·결제를 만들지 않는다.
 * 다만 429 카운터를 채우므로 **운영 서버에는 돌리지 말 것.**
 *
 * ⚠️ 이 프로브는 백엔드와 같은 호스트에서 도는 것을 전제로 한다.
 *    고친 뒤에는 모든 로컬 요청이 같은 소켓 주소(127.0.0.1)를 쓰므로
 *    아래 세 검사가 **하나의 버킷**을 공유한다 — 그게 바로 정상 동작이다.
 */

const BASE = process.env.BACKEND_URL || "http://localhost:9000"
// 다른 프로브들과 같은 이름(PUBKEY)을 먼저 본다 —
// 이름이 달라 키가 안 넘어가면 전부 400 이 나면서 "우회 성공"처럼 보인다(실제로 겪음).
const PUB =
  process.env.PUBKEY ||
  process.env.MEDUSA_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
  ""
if (!PUB) {
  console.error("PUBKEY 가 없습니다. BASE=... PUBKEY=pk_... 로 실행하세요.")
  process.exit(2)
}

const LOOKUP = "/store/orders/lookup"
const LOOKUP_LIMIT = 30 // 분당
const BEST_LIMIT = 60 // 분당

const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`${pass ? "  PASS" : "  FAIL"}  ${name}\n        ${detail}`)
}

function headers(extra = {}) {
  const h = { "content-type": "application/json", ...extra }
  if (PUB) h["x-publishable-api-key"] = PUB
  return h
}

const fmt = (c) =>
  Object.entries(c)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([k, v]) => `${k}×${v}`)
    .join(" · ")

const lookupBody = JSON.stringify({ display_id: 99999999, email: "probe@example.invalid" })

/** 순차 호출. xff 가 null 이면 헤더를 붙이지 않는다. */
async function seq(path, n, xffOf, init = {}) {
  const codes = {}
  for (let i = 0; i < n; i++) {
    const xff = xffOf(i)
    const h = headers(xff ? { "x-forwarded-for": xff } : {})
    let code
    try {
      code = (await fetch(BASE + path, { ...init, headers: h })).status
    } catch {
      code = "ERR"
    }
    codes[code] = (codes[code] || 0) + 1
  }
  return codes
}

console.log(`\n레이트리밋 우회 프로브 → ${BASE}\n${"─".repeat(66)}`)

// ── 1. 카운터 원자성 ────────────────────────────────────────────────
// 버킷이 비어 있는 상태에서 40건을 **동시에** 던진다.
// rlIncr 은 캐시 get→set 이라 읽기와 쓰기 사이가 벌어져 있다.
// 동시 요청이 같은 값을 읽고 같은 값을 쓰면 카운터가 덜 올라간다
// = 버스트 공격(레이트리밋이 가장 필요한 상황)에서 제한이 헐거워진다.
{
  console.log(`\n[1] 카운터 원자성 — 빈 버킷에 40건 동시 전송 (통과 ${LOOKUP_LIMIT}건 이하 기대)`)
  const h = headers()
  const codes = {}
  const rs = await Promise.all(
    Array.from({ length: 40 }, () =>
      fetch(BASE + LOOKUP, { method: "POST", body: lookupBody, headers: h })
        .then((r) => r.status)
        .catch(() => "ERR")
    )
  )
  for (const c of rs) codes[c] = (codes[c] || 0) + 1
  const passed = 40 - (codes[429] || 0)
  record(
    "동시 전송에도 카운터가 정확히 센다",
    passed <= LOOKUP_LIMIT + 3, // 창 경계 여유 3
    `${fmt(codes)} → 통과 ${passed}건 (상한 ${LOOKUP_LIMIT})` +
      (passed > LOOKUP_LIMIT + 3 ? `  ⚠ ${passed - LOOKUP_LIMIT}건 초과 = 카운터가 덜 셌다` : "")
  )
}

// ── 2. 헤더 위조로 버킷 갈아치우기 ──────────────────────────────────
// [1] 에서 버킷을 이미 한도까지 채웠다.
// 이제 XFF 만 매번 바꿔서 보낸다 — **하나라도 통과하면 새 버킷이 생긴 것**이다.
{
  console.log("\n[2] 버킷 소진 상태에서 X-Forwarded-For 만 바꿔 40회 (전부 429 기대)")
  const codes = await seq(LOOKUP, 40, (i) => `203.0.113.${(i % 250) + 1}`, {
    method: "POST",
    body: lookupBody,
  })
  const leaked = 40 - (codes[429] || 0) - (codes["ERR"] || 0)
  record(
    "헤더를 바꿔도 새 버킷이 생기지 않는다",
    leaked === 0,
    `${fmt(codes)} → 통과 ${leaked}건` +
      (leaked > 0 ? `  ⚠ 우회 성공 — 헤더 하나로 제한이 무력화된다` : "")
  )
}

// ── 3. 다른 버킷(베스트 상품)도 같은지 ──────────────────────────────
// ipRateLimit 팩토리를 쓰는 모든 경로가 같이 고쳐졌는지 확인한다.
{
  console.log(`\n[3] 베스트 상품(분당 ${BEST_LIMIT}) — 헤더 회전 80회 (${BEST_LIMIT}건 초과분은 429 기대)`)
  const codes = await seq("/store/best-products?limit=1", 80, (i) => `198.51.100.${(i % 250) + 1}`)
  const ok = codes[200] || 0
  record(
    "다른 레이트리밋 경로도 우회되지 않는다",
    ok <= BEST_LIMIT + 3,
    `${fmt(codes)} → 200 ${ok}건 (상한 ${BEST_LIMIT})` +
      (ok > BEST_LIMIT + 3 ? "  ⚠ 우회 성공" : "")
  )
}

// ── 요약 ────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.pass)
console.log(`\n${"─".repeat(66)}`)
console.log(`${results.length - failed.length}/${results.length} 통과`)
if (failed.length) {
  console.log("\n우회된 항목:")
  for (const f of failed) console.log(`  · ${f.name} — ${f.detail}`)
  console.log(
    "\n확인할 것:\n" +
      "  · api/_utils/client-ip.ts 가 req.ip 를 쓰고 있지 않은지\n" +
      "    (Medusa 가 trust proxy 를 켜므로 req.ip 는 XFF 에서 온다 = 위조 가능)\n" +
      "  · TRUSTED_PROXY_HOPS 가 실제 프록시 대수보다 크게 잡혀 있지 않은지"
  )
}
process.exit(failed.length ? 1 : 0)
