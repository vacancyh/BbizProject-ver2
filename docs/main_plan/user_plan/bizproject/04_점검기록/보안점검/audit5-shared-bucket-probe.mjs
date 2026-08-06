/**
 * 레이트리밋 버킷 공유 프로브 (2026-08-04)
 *
 * ── 무엇을 확인하나 ────────────────────────────────────────────────
 * 스토어프론트의 데이터 계층은 전부 Next.js **서버 액션**(`"use server"`)이다.
 * 즉 리뷰 작성·문의·장바구니 담기 같은 요청이 **고객 브라우저가 아니라
 * 스토어프론트 서버에서** 백엔드로 나간다.
 *
 * 원래는 스토어프론트가 고객 IP 를 백엔드로 전달하지 않아,
 * 백엔드가 보는 요청자가 **항상 스토어프론트 서버 한 대**였다.
 * → IP 기준 레이트리밋이 "고객 1명당"이 아니라 **"쇼핑몰 전체 합산"** 으로 걸렸다.
 *   (2026-08-04 실측: 고객 10명이 비밀번호를 틀리면 11번째 고객까지 로그인 429)
 *
 * 2026-08-04 조치: `INTERNAL_CLIENT_IP_SECRET` 공유 시크릿으로
 * 스토어프론트가 확인한 고객 IP 를 서명과 함께 전달하도록 했다.
 *
 * 이 프로브가 확인하는 것
 *   [1]~[3] 전달을 **끄면** 한도가 얼마나 되는지 (= 쇼핑몰 전체가 1분간 쓸 수 있는 양)
 *   [4]     전달을 **켜면** 고객별로 갈리는지 + 서명 위조가 막히는지
 *
 * ⚠️ [1]~[3] 의 WARN 은 "전달을 끄면 이렇게 된다" 는 참고 수치다.
 *    실제 판정은 [4] 로 한다 — 여기가 OK 면 운영 설정만 하면 된다.
 *
 * ── 실행 ───────────────────────────────────────────────────────────
 *   BASE=http://localhost:9000 PUBKEY=pk_... node audit5-shared-bucket-probe.mjs
 *
 * ── 안전성 ─────────────────────────────────────────────────────────
 * 조회와 "존재하지 않는 대상에 대한 쓰기 시도"만 보낸다. 실제 데이터를 만들지 않는다.
 * 429 카운터를 채우므로 운영 서버 금지.
 */

const BASE = process.env.BASE || "http://localhost:9000"
const PUB = process.env.PUBKEY || process.env.MEDUSA_PUBLISHABLE_KEY || ""
if (!PUB) {
  console.error("PUBKEY 가 없습니다. BASE=... PUBKEY=pk_... 로 실행하세요.")
  process.exit(2)
}

const results = []
function record(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`${pass ? "  OK  " : " WARN "}  ${name}\n        ${detail}`)
}

function headers() {
  const h = { "content-type": "application/json" }
  if (PUB) h["x-publishable-api-key"] = PUB
  return h
}

/** 스토어프론트 서버가 보내는 것과 동일하게(고객 IP 헤더 없이) n회 순차 전송 */
async function countUntilBlocked(path, n, init = {}) {
  const codes = {}
  let firstBlockAt = null
  for (let i = 0; i < n; i++) {
    let code
    try {
      code = (await fetch(BASE + path, { ...init, headers: headers() })).status
    } catch {
      code = "ERR"
    }
    codes[code] = (codes[code] || 0) + 1
    if (code === 429 && firstBlockAt === null) firstBlockAt = i + 1
  }
  return { codes, firstBlockAt }
}

const fmt = (c) =>
  Object.entries(c)
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([k, v]) => `${k}×${v}`)
    .join(" · ")

console.log(`\n레이트리밋 버킷 공유 프로브 → ${BASE}`)
console.log("스토어프론트 서버가 보내는 방식(고객 IP 헤더 없음)을 그대로 흉내낸다")
console.log("─".repeat(70))

// ── 1. 익명 쓰기 (리뷰·문의·지원·재입고) — 분당 20 ──────────────────
{
  console.log("\n[1] 지원 문의 쓰기 — 40회 (설정: 분당 20)")
  const { codes, firstBlockAt } = await countUntilBlocked("/store/support-inquiries", 40, {
    method: "POST",
    body: JSON.stringify({ title: "probe", content: "probe", email: "probe@example.invalid" }),
  })
  const blocked = codes[429] || 0
  record(
    "익명 쓰기 한도가 고객별이 아니라 쇼핑몰 전체 합산이다",
    blocked === 0,
    `${fmt(codes)} — ${firstBlockAt ? `${firstBlockAt}번째부터 429` : "차단 없음"}\n` +
      `        → 스토어프론트를 통하면 이 숫자가 **전 고객 합산 분당 한도**가 된다`
  )
}

// ── 2. 장바구니 수량 변경 — 분당 20 ─────────────────────────────────
// 주의: 레이트리밋이 걸린 것은 **담기**(`/line-items`)가 아니라
//       **수량 변경**(`/line-items/:line_id`)이다. 담기에는 수량 가드만 있다.
// 실제 카트를 만들지 않기 위해 존재하지 않는 ID 로 보낸다.
// 레이트리밋은 라우트 핸들러보다 먼저 걸리므로 429 여부는 동일하게 측정된다.
{
  console.log("\n[2] 장바구니 수량 변경 — 40회 (설정: 분당 20)")
  const { codes, firstBlockAt } = await countUntilBlocked(
    "/store/carts/cart_probe_nonexistent/line-items/item_probe_nonexistent",
    40,
    { method: "POST", body: JSON.stringify({ quantity: 1 }) }
  )
  const blocked = codes[429] || 0
  record(
    "장바구니 수량 변경 한도가 쇼핑몰 전체 합산이다",
    blocked === 0,
    `${fmt(codes)} — ${firstBlockAt ? `${firstBlockAt}번째부터 429` : "차단 없음"}\n` +
      `        → 분당 이 횟수를 넘으면 **모든 고객이** 수량 변경에 실패한다`
  )
}

// ── 3. 베스트 상품 (홈 화면 SSR) — 분당 60 ──────────────────────────
{
  console.log("\n[3] 베스트 상품 조회 — 100회 (설정: 분당 60)")
  const { codes, firstBlockAt } = await countUntilBlocked("/store/best-products?limit=1", 100)
  const blocked = codes[429] || 0
  record(
    "홈 화면 SSR 조회 한도가 쇼핑몰 전체 합산이다",
    blocked === 0,
    `${fmt(codes)} — ${firstBlockAt ? `${firstBlockAt}번째부터 429` : "차단 없음"}\n` +
      `        → 캐시 미스 시 분당 이 횟수를 넘으면 홈 화면이 깨진다`
  )
}

// ── 4. 내부 전달 헤더가 제대로 동작하는가 ───────────────────────────
// 스토어프론트가 고객 IP 를 대신 알려주는 경로(INTERNAL_CLIENT_IP_SECRET).
// 두 가지를 확인한다: ① 서명이 맞으면 고객별로 버킷이 갈리는가
//                    ② 서명이 틀리면 무시되는가(아무나 남의 버킷을 못 건드리게)
{
  const secret = process.env.INTERNAL_CLIENT_IP_SECRET
  if (!secret) {
    console.log("\n[4] 내부 IP 전달 — INTERNAL_CLIENT_IP_SECRET 미설정이라 건너뜀")
  } else {
    const send = (ip, token) =>
      fetch(BASE + "/store/support-inquiries", {
        method: "POST",
        headers: {
          ...headers(),
          "x-internal-client-ip": ip,
          ...(token ? { "x-internal-client-ip-token": token } : {}),
        },
        body: JSON.stringify({ title: "probe", content: "probe", email: "p@example.invalid" }),
      }).then((r) => r.status)

    // 고객 A 가 한도를 다 쓴다
    const a = {}
    for (let i = 0; i < 25; i++) {
      const c = await send("198.51.100.11", secret)
      a[c] = (a[c] || 0) + 1
    }
    // 고객 B 는 아직 한 번도 안 썼다 → 통과해야 한다
    const b = await send("198.51.100.22", secret)
    console.log("\n[4] 내부 IP 전달 — 고객별로 버킷이 갈리는가")
    record(
      "고객 A 가 한도를 써도 고객 B 는 막히지 않는다",
      b !== 429,
      `A: ${fmt(a)} → B: ${b}` + (b === 429 ? "  ⚠️ 여전히 버킷을 공유한다" : "  (고객별 분리됨)")
    )

    // 서명이 틀리면 무시돼야 한다 — 아무나 남의 버킷 키를 지정하지 못하게
    const forged = await send("198.51.100.33", "wrong-secret")
    record(
      "서명이 틀린 IP 헤더는 무시된다",
      forged === 429,
      `위조 토큰으로 새 IP 지정 → ${forged}` +
        (forged === 429
          ? "  (무시하고 기존 버킷 사용 — 정상)"
          : "  ⚠️ 위조 헤더로 새 버킷을 만들 수 있다")
    )
  }
}

// ── 요약 ────────────────────────────────────────────────────────────
// 판정은 [4](전달 경로)로만 한다. [1]~[3] 은 "전달을 끄면 이렇게 된다"는 참고 수치다.
const gate = results.filter((r) => r.name.startsWith("고객 A") || r.name.startsWith("서명"))
const shared = results.filter((r) => !r.pass && !gate.includes(r))
const gateFailed = gate.filter((r) => !r.pass)

console.log(`\n${"─".repeat(70)}`)
if (shared.length) {
  console.log(`참고 — 전달을 끄면 ${shared.length}개 한도가 쇼핑몰 전체 합산으로 걸린다.`)
  console.log("       (스토어프론트가 서버 액션으로 호출하므로 백엔드는 고객을 구분 못 한다)\n")
}
if (!gate.length) {
  console.log("판정 불가 — INTERNAL_CLIENT_IP_SECRET 을 주고 다시 실행하세요.")
  process.exit(2)
}
if (gateFailed.length) {
  console.log("⚠️  고객 IP 전달 경로가 동작하지 않는다:")
  for (const f of gateFailed) console.log(`  · ${f.name} — ${f.detail}`)
  console.log("\n확인: 스토어프론트와 백엔드의 INTERNAL_CLIENT_IP_SECRET 이 같은 값인지,")
  console.log("      스토어프론트 STOREFRONT_TRUSTED_PROXY_HOPS 가 프록시 대수와 맞는지.")
} else {
  console.log("고객 IP 전달 경로 정상 — 고객별로 버킷이 갈리고, 서명 위조는 무시된다.")
  console.log("→ 운영에서는 두 앱에 INTERNAL_CLIENT_IP_SECRET 를 같은 값으로 넣어야 한다.")
}
process.exit(gateFailed.length ? 1 : 0)
