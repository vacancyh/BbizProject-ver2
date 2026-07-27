#!/usr/bin/env node
/**
 * 보안 동적 프로브 — 실행 중인 백엔드에 실제 공격 시나리오를 던져 방어를 확인한다(방어적 점검).
 * 전제: 시드된 백엔드가 :9009 등에 기동. 사용법은 README.md.
 * 실행: BASE=http://localhost:9009 PUBKEY=pk_xxx node security-probe.mjs
 * 산출물: probe-results.json (+ 콘솔). 결과는 SECURITY-REPORT.md 에 종합된다.
 *
 * 각 체크는 result: "OK"(방어 정상) / "WEAK"(약점 발견) / "INFO" 로 기록.
 */
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE || "http://localhost:9009"
const PUB = process.env.PUBKEY || ""
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@shop.local"
const ADMIN_PW = process.env.ADMIN_PW || "admin1234!"
const DEMO_PW = "test1234!"

const findings = []
function rec(id, name, severity, result, evidence, remediation = "") {
  findings.push({ id, name, severity, result, evidence: (evidence ?? "").toString(), remediation })
  const mark = result === "OK" ? "OK  " : result === "WEAK" ? "WEAK" : "INFO"
  console.log(`${mark} [${severity}] ${id} ${name} — ${evidence ?? ""}`)
}

async function http(method, path, opts = {}) {
  const { token, pub = true, body, headers = {}, raw } = opts
  const h = { "content-type": "application/json", ...headers }
  if (pub && PUB) h["x-publishable-api-key"] = PUB
  if (token) h["authorization"] = `Bearer ${token}`
  let res, json = null, text = null, err = null, hdrs = {}
  try {
    res = await fetch(BASE + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined })
    hdrs = Object.fromEntries(res.headers.entries())
    const ct = res.headers.get("content-type") || ""
    if (!raw && ct.includes("application/json")) { try { json = await res.json() } catch {} }
    else { try { text = await res.text() } catch {} }
  } catch (e) { err = e?.message }
  return { status: res?.status ?? 0, json, text, err, headers: hdrs }
}
const pick = (o, ...k) => k.map((x) => o?.[x]).find((v) => v !== undefined)
const login = async (email, password) => pick((await http("POST", "/auth/customer/emailpass", { body: { email, password } })).json || {}, "token")
const loginAdmin = async () => pick((await http("POST", "/auth/user/emailpass", { pub: false, body: { email: ADMIN_EMAIL, password: ADMIN_PW } })).json || {}, "token")

async function main() {
  console.log(`\n== 보안 동적 프로브 ==  BASE=${BASE}\n`)
  const admin = await loginAdmin()
  const gold = await login("gold@kr-demo.local", DEMO_PW)
  const vip = await login("vip@kr-demo.local", DEMO_PW)

  // 대표 자원
  const prod = (await http("GET", "/store/products?limit=1", {})).json?.products?.[0]
  const productId = prod?.id
  const goldOrders = (await http("GET", "/store/orders", { token: gold })).json?.orders ?? []
  const goldOrderId = goldOrders[0]?.id
  const goldOrderDid = goldOrders[0]?.display_id

  // ── SEC-1 접근제어 / IDOR (BOLA) ─────────────────────────
  if (goldOrderId && vip) {
    // vip 가 gold 의 주문 상세 조회 시도
    let r = await http("GET", `/store/orders/${goldOrderId}`, { token: vip })
    rec("IDOR-1", "타인 주문 상세 접근", "HIGH", (r.status === 403 || r.status === 404) ? "OK" : "WEAK", `vip→gold order = ${r.status}`, "소유자 검증(actor_id===order.customer_id) 필요")
    // vip 가 gold 주문 취소/반품 신청
    r = await http("POST", `/store/orders/${goldOrderId}/request`, { token: vip, body: { type: "cancel", reason: "probe" } })
    rec("IDOR-2", "타인 주문 취소신청", "HIGH", (r.status === 403 || r.status === 404) ? "OK" : "WEAK", `= ${r.status}`, "소유권 검증 필요")
    // vip 가 gold 주문 구매확정
    r = await http("POST", `/store/orders/${goldOrderId}/confirm`, { token: vip })
    rec("IDOR-3", "타인 주문 구매확정", "HIGH", (r.status === 403 || r.status === 404) ? "OK" : "WEAK", `= ${r.status}`, "소유권 검증 필요")
    // vip 가 gold 주문 현금영수증 신청
    r = await http("POST", `/store/orders/${goldOrderId}/tax-receipt`, { token: vip, body: { type: "cash_receipt", identifier: "01000000000" } })
    rec("IDOR-4", "타인 주문 영수증신청", "HIGH", (r.status === 403 || r.status === 404) ? "OK" : "WEAK", `= ${r.status}`, "소유권 검증 필요")
  }

  // ── SEC-2 인증/인가 우회 ─────────────────────────────────
  let r = await http("GET", "/admin/orders", { pub: false })
  rec("AUTH-1", "미인증 admin 접근", "HIGH", r.status === 401 ? "OK" : "WEAK", `= ${r.status}`, "관리자 인증 필수")
  r = await http("GET", "/admin/orders", { token: gold, pub: false })
  rec("AUTH-2", "고객토큰 admin 접근", "HIGH", (r.status === 401 || r.status === 403) ? "OK" : "WEAK", `= ${r.status}`, "actor_type=user 강제")
  r = await http("GET", "/store/customers/me/points", { headers: { authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.eyJmYWtlIjoxfQ.badsig" } })
  rec("AUTH-3", "위조 JWT 거부", "HIGH", r.status === 401 ? "OK" : "WEAK", `= ${r.status}`, "서명검증 필수")
  // alg=none 시도
  const noneJwt = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJhY3Rvcl9pZCI6ImFkbWluIn0."
  r = await http("GET", "/admin/orders", { pub: false, headers: { authorization: `Bearer ${noneJwt}` } })
  rec("AUTH-4", "alg=none JWT 거부", "CRITICAL", r.status === 401 ? "OK" : "WEAK", `= ${r.status}`, "alg=none 반드시 거부")

  // ── SEC-3 권한상승: 리뷰 모더레이션 우회 ─────────────────
  if (productId && gold) {
    const marker = `secprobe-${Date.now()}`
    await http("POST", `/store/products/${productId}/reviews`, { token: gold, body: { author_email: "gold@kr-demo.local", rating: 5, title: marker, content: `${marker} 모더레이션 우회 시도`, status: "published" } })
    const list = (await http("GET", `/store/products/${productId}/reviews`, {})).json?.reviews ?? []
    const leaked = list.some((x) => (x.title || "").includes(marker))
    rec("PRIV-1", "리뷰 status=published 주입(모더레이션 우회)", "MEDIUM", leaked ? "WEAK" : "OK", leaked ? "승인 없이 즉시 노출됨" : "pending 강제(정상)", "클라이언트 status 무시, 항상 pending")
  }

  // ── SEC-4 보안 헤더 ──────────────────────────────────────
  const hr = await http("GET", "/store/products?limit=1", {})
  const H = hr.headers
  const wantHeaders = [
    ["x-content-type-options", "nosniff", "LOW"],
    ["x-frame-options", "DENY/SAMEORIGIN", "MEDIUM"],
    ["referrer-policy", "no-referrer 등", "LOW"],
    ["strict-transport-security", "HSTS", "MEDIUM"],
    ["content-security-policy", "CSP", "MEDIUM"],
    ["permissions-policy", "Permissions-Policy", "LOW"],
  ]
  for (const [hname, want, sev] of wantHeaders) {
    const present = !!H[hname]
    rec(`HDR-${hname}`, `보안헤더 ${hname}`, sev, present ? "OK" : "WEAK", present ? H[hname].slice(0, 40) : `누락(${want})`, `백엔드/next.config 에 ${hname} 추가`)
  }

  // ── SEC-5 쿠키 플래그(로그인 Set-Cookie) ─────────────────
  {
    const lr = await http("POST", "/auth/customer/emailpass", { body: { email: "gold@kr-demo.local", password: DEMO_PW } })
    const sc = lr.headers["set-cookie"]
    if (sc) {
      const ok = /httponly/i.test(sc) && /samesite/i.test(sc)
      rec("COOKIE-1", "인증 쿠키 플래그", "MEDIUM", ok ? "OK" : "WEAK", sc.slice(0, 60), "HttpOnly+Secure+SameSite")
    } else rec("COOKIE-1", "인증 쿠키 플래그", "INFO", "INFO", "로그인이 Set-Cookie 없이 Bearer 토큰 방식", "토큰 저장은 클라이언트 책임(XSS 주의)")
  }

  // ── SEC-6 레이트리밋(로그인 브루트포스) ───────────────────
  {
    const attempts = await Promise.all(Array.from({ length: 12 }, () => http("POST", "/auth/user/emailpass", { pub: false, body: { email: ADMIN_EMAIL, password: "wrong-" + Math.random() } })))
    const codes = attempts.map((a) => a.status)
    const limited = codes.some((c) => c === 429)
    rec("RATE-1", "로그인 브루트포스 제한", "HIGH", limited ? "OK" : "WEAK", `codes=${JSON.stringify(codes)}`, "로그인/가입에 rate-limit(예: 5/min/IP) 필요")
  }

  // ── SEC-7 사용자 열거(enumeration) ───────────────────────
  {
    const r1 = await http("POST", "/auth/customer/emailpass", { body: { email: "gold@kr-demo.local", password: "definitely-wrong" } })
    const r2 = await http("POST", "/auth/customer/emailpass", { body: { email: `nobody-${Date.now()}@x.local`, password: "definitely-wrong" } })
    const same = r1.status === r2.status
    rec("ENUM-1", "로그인 사용자 열거 방지", "LOW", same ? "OK" : "WEAK", `존재=${r1.status} 미존재=${r2.status}`, "존재/미존재 응답 동일화")
    // 비회원 주문조회 열거
    if (goldOrderDid) {
      const g1 = await http("POST", "/store/orders/lookup", { body: { display_id: goldOrderDid, email: "wrong@x.com" } })
      rec("ENUM-2", "주문조회 열거 방지", "LOW", g1.status === 404 ? "OK" : "WEAK", `불일치=${g1.status}`, "불일치 시 404(정보 미노출)")
    }
  }

  // ── SEC-8 에러 정보노출 ──────────────────────────────────
  {
    // 잘못된 JSON / 잘못된 id 로 에러 유발 후 스택/경로 노출 확인
    const r1 = await http("GET", "/store/products/prod_does_not_exist_xyz", {})
    const body = JSON.stringify(r1.json || r1.text || "")
    const leaks = /at\s+\/|node_modules|\.ts:\d+|stack|SELECT\s|postgres|mikro/i.test(body)
    rec("ERR-1", "에러 스택/내부정보 노출", "MEDIUM", leaks ? "WEAK" : "OK", leaks ? body.slice(0, 80) : "일반화된 응답", "에러 응답에 스택/SQL/경로 미포함")
  }

  // ── SEC-9 CORS 반사 ──────────────────────────────────────
  {
    const r1 = await http("GET", "/store/products?limit=1", { headers: { origin: "https://evil.example.com" } })
    const aco = r1.headers["access-control-allow-origin"]
    const acc = r1.headers["access-control-allow-credentials"]
    const reflectsEvil = aco === "https://evil.example.com"
    const wildcardWithCreds = aco === "*" && String(acc) === "true"
    const weak = reflectsEvil || wildcardWithCreds
    rec("CORS-1", "CORS 임의 오리진 반사", "MEDIUM", weak ? "WEAK" : "OK", `ACAO=${aco ?? "(none)"} creds=${acc ?? "-"}`, "허용 오리진 화이트리스트 고정")
  }

  // ── SEC-10 비즈니스 로직: 음수/초과 적립금 ────────────────
  if (gold) {
    // 카트 생성 후 음수 포인트 적용 시도
    const region = ((await http("GET", "/store/regions", {})).json?.regions ?? []).find((x) => x.currency_code === "krw")
    const variant = prod?.variants?.[0]?.id
    if (region && variant) {
      const cart = (await http("POST", "/store/carts", { token: gold, body: { region_id: region.id, email: "gold@kr-demo.local", items: [{ variant_id: variant, quantity: 1 }] } })).json?.cart
      if (cart?.id) {
        const neg = await http("POST", `/store/carts/${cart.id}/points`, { token: gold, body: { points: -100000 } })
        rec("BIZ-1", "음수 적립금 적용 차단", "MEDIUM", (neg.status >= 400) ? "OK" : "WEAK", `= ${neg.status}`, "points<=0 및 잔액초과 검증")
        const over = await http("POST", `/store/carts/${cart.id}/points`, { token: gold, body: { points: 99999999 } })
        rec("BIZ-2", "잔액초과 적립금 차단", "MEDIUM", (over.status >= 400) ? "OK" : "WEAK", `= ${over.status}`, "잔액 초과 사용 거부")
      }
    }
  }

  // ── 리포트 ───────────────────────────────────────────────
  const weak = findings.filter((f) => f.result === "WEAK")
  writeFileSync(join(HERE, "probe-results.json"), JSON.stringify({ base: BASE, stamp: process.env.RUN_STAMP || "", total: findings.length, weak: weak.length, findings }, null, 2))
  console.log(`\n==== 프로브 완료: 총 ${findings.length}개, 약점 ${weak.length}개 ====`)
  weak.forEach((f) => console.log(`  ⚠ [${f.severity}] ${f.id} ${f.name} — ${f.evidence}`))
}
main().catch((e) => { console.error("probe 예외:", e); process.exit(2) })
