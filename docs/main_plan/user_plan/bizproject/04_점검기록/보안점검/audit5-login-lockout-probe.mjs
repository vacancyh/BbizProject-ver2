/**
 * 로그인 전체 잠금 프로브 (2026-08-04)
 *
 * ── 무엇을 확인하나 ────────────────────────────────────────────────
 * 스토어프론트 로그인은 Next.js **서버 액션**이다(`lib/data/customer.ts` 의 `"use server"`).
 * 즉 로그인 요청이 고객 브라우저가 아니라 **스토어프론트 서버**에서 백엔드로 나가고,
 * 스토어프론트는 고객 IP 를 백엔드로 전달하지 않는다.
 *
 * 백엔드의 로그인 실패 카운터는 두 축이다(`middlewares.ts` authRateLimit):
 *   · 계정별  5회 / 15분  → 특정 계정 노리는 공격을 막는다 (정상)
 *   · IP별   10회 / 5분   → ⚠️ 모든 고객이 IP 하나를 공유한다
 *
 * 그래서 **서로 다른 고객 10명이 비밀번호를 틀리면, 11번째 고객은
 * 비밀번호가 맞아도 로그인할 수 없다.** 이걸 실제로 던져서 확인한다.
 *
 * ── 실행 ───────────────────────────────────────────────────────────
 *   BASE=http://localhost:9000 node audit5-login-lockout-probe.mjs
 *
 * ── 안전성 ─────────────────────────────────────────────────────────
 * 실패 로그인만 보내고 데이터를 만들지 않는다.
 * 다만 **5분간 로그인 IP 카운터를 채운다** — 운영 서버 금지.
 * (성공 로그인 1회로 카운터가 리셋되므로, 끝나면 자동 복구된다)
 */

const BASE = process.env.BASE || "http://localhost:9000"
const VALID = {
  email: process.env.PROBE_EMAIL || "test@kr-demo.local",
  password: process.env.PROBE_PASSWORD || "test1234!",
}

const AUTH = "/auth/customer/emailpass"
const SECRET = process.env.INTERNAL_CLIENT_IP_SECRET

/**
 * ip 를 주면 "스토어프론트가 대신 알려준 고객 IP" 로 보낸다.
 * 안 주면 스토어프론트가 IP 를 전달하지 않던 옛 동작(전 고객이 IP 하나 공유)을 흉내낸다.
 */
const post = (body, ip) => {
  const headers = { "content-type": "application/json" }
  if (ip && SECRET) {
    headers["x-internal-client-ip"] = ip
    headers["x-internal-client-ip-token"] = SECRET
  }
  return fetch(BASE + AUTH, { method: "POST", headers, body: JSON.stringify(body) })
}

console.log(`\n로그인 전체 잠금 프로브 → ${BASE}\n${"─".repeat(66)}`)

// ── 0. 기준선: 정상 계정이 지금 로그인 되는가 ───────────────────────
{
  const r = await post(VALID)
  if (r.status !== 200) {
    console.log(
      `\n중단 — 기준선 로그인이 실패했습니다 (status=${r.status}).\n` +
        `      계정을 PROBE_EMAIL / PROBE_PASSWORD 로 지정하거나,\n` +
        `      앞선 실행의 5분 창이 끝나기를 기다린 뒤 다시 실행하세요.`
    )
    process.exit(2)
  }
  console.log("\n[0] 기준선 — 정상 계정 로그인 성공 (200)")
}

// ── 1. 서로 다른 고객 12명이 비밀번호를 틀린다 ──────────────────────
// 계정별 카운터(5회/15분)에 걸리지 않도록 매번 다른 이메일을 쓴다.
// = "각기 다른 고객이 한 번씩 실수했다" 는 상황
{
  const codes = {}
  for (let i = 0; i < 12; i++) {
    const r = await post({ email: `shopper-${i}@example.invalid`, password: "wrong-password" })
    codes[r.status] = (codes[r.status] || 0) + 1
  }
  const fmt = Object.entries(codes)
    .map(([k, v]) => `${k}×${v}`)
    .join(" · ")
  console.log(`\n[1] 서로 다른 고객 12명이 각 1회 실패 — ${fmt}`)
}

// ── 2. 그 뒤 정상 고객이 올바른 비밀번호로 로그인 ───────────────────
{
  const r = await post(VALID)
  const body = await r.json().catch(() => ({}))
  const blocked = r.status === 429

  console.log(`\n[2] 아무 잘못 없는 고객이 올바른 비밀번호로 로그인`)
  console.log(`${blocked ? " FAIL " : "  OK  "}  다른 고객의 실패가 정상 고객을 막지 않는다`)
  console.log(
    `        status=${r.status}${body?.code ? ` code=${body.code}` : ""}` +
      (blocked
        ? `\n        ⚠️ 막혔다 — 고객 12명이 실수하면 쇼핑몰 전체가 5분간 로그인 불가`
        : `\n        정상 로그인됨`)
  )

  // ── 3. 고객 IP 를 전달하면 해소되는가 ─────────────────────────────
  let fixedOk = null
  if (SECRET) {
    // 앞 단계에서 공유 버킷은 이미 잠겼다.
    // 이제 각 고객이 자기 IP 로 구분되면, 새 고객은 영향을 안 받아야 한다.
    const r2 = await post(VALID, "198.51.100.77")
    fixedOk = r2.status === 200
    console.log(`\n[3] 고객 IP 전달을 켠 상태에서 같은 고객이 로그인`)
    console.log(`${fixedOk ? "  OK  " : " FAIL "}  고객별로 구분되어 정상 로그인된다`)
    console.log(
      `        status=${r2.status}` +
        (fixedOk
          ? "  (다른 고객의 실패가 영향을 주지 않음)"
          : "  ⚠️ 전달을 켰는데도 막힌다 — 시크릿이 백엔드와 다른지 확인")
    )
  } else {
    console.log(`\n[3] 건너뜀 — INTERNAL_CLIENT_IP_SECRET 이 없어 전달 경로를 확인할 수 없다`)
  }

  console.log(`\n${"─".repeat(66)}`)
  if (blocked && fixedOk !== true) {
    console.log("원인: 스토어프론트 로그인이 서버 액션이라 백엔드가 보는 IP 가 항상 하나다.")
    console.log("      IP별 실패 카운터(10회/5분)가 전 고객 합산으로 걸린다.\n")
    console.log("고칠 방법:")
    console.log("  스토어프론트·백엔드에 INTERNAL_CLIENT_IP_SECRET 를 같은 값으로 넣고")
    console.log("  스토어프론트 STOREFRONT_TRUSTED_PROXY_HOPS 를 실제 프록시 대수로 설정한다.")
    console.log("\n※ 계정별 카운터(5회/15분)는 정상 동작하므로, 특정 계정 브루트포스는 계속 막힌다.")
  } else if (blocked && fixedOk) {
    console.log("확인: 전달을 끄면 전 고객이 함께 잠기고, 켜면 고객별로 분리된다.")
    console.log("      → 운영 배포 시 INTERNAL_CLIENT_IP_SECRET + STOREFRONT_TRUSTED_PROXY_HOPS 필수.")
  } else {
    console.log("로그인 제한이 고객별로 분리돼 있다.")
  }
  // 전달을 켰는데도 막히면 실패로 본다. 전달이 없는 상태의 잠금은 설정 문제로 안내만 한다.
  process.exit(fixedOk === false ? 1 : 0)
}
