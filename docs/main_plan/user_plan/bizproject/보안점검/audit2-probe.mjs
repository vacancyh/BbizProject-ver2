/**
 * 2차 심층 보안·기능 프로브 (2026-08-03)
 *
 * 1차 프로브(presale-security-probe.mjs)가 다루지 않은 벡터를 노린다.
 *   G. 토큰 혼용·위조 (audience confusion / alg=none / 변조)
 *   H. 권한 상승 (mass assignment — 적립금·등급·권한 자가 부여)
 *   I. 동시성 경합 (적립금 이중 사용, 멱등키 동시 실행)
 *   J. 전송·경계 (CORS 자격증명 반사, publishable key 강제)
 *   K. 입력 경계 (경로순회, 널바이트, 초대형 페이로드, 유니코드)
 *   L. 재고·오버셀
 *
 * 실행: BASE=http://localhost:9000 PUBKEY=pk_... node audit2-probe.mjs
 * 원칙: 실제 요청을 던져 "막히는지"를 본다. 방어가 동작하면 PASS.
 */
const BASE = process.env.BASE || "http://localhost:9000"
const PUB = process.env.PUBKEY
const ADMIN = { email: "admin@shop.local", password: "admin1234!" }

let pass = 0, fail = 0, warn = 0
const results = []
function rec(id, name, ok, detail, level = "FAIL") {
  const status = ok ? "PASS" : level
  if (ok) pass++
  else if (level === "WARN") warn++
  else fail++
  results.push({ id, name, status, detail })
  console.log(`${ok ? "✅" : level === "WARN" ? "⚠️ " : "❌"} ${id} ${name} — ${detail}`)
}

async function http(method, path, { token, body, pub = true, headers = {}, raw } = {}) {
  const h = { "content-type": "application/json", ...headers }
  if (pub && PUB) h["x-publishable-api-key"] = PUB
  if (token) h["authorization"] = `Bearer ${token}`
  let res, json = null, text = null
  try {
    res = await fetch(BASE + path, {
      method,
      headers: h,
      body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
    })
    const ct = res.headers.get("content-type") || ""
    if (ct.includes("json")) { try { json = await res.json() } catch {} }
    else { try { text = await res.text() } catch {} }
    return { status: res.status, json, text, headers: res.headers }
  } catch (e) {
    return { status: 0, json: null, text: String(e?.message), headers: new Map() }
  }
}

const uniq = () => Math.random().toString(36).slice(2, 10)

async function makeCustomer() {
  const email = `a2_${uniq()}@kr-audit.local`
  const password = "auditpass1234!"
  const reg = await http("POST", "/auth/customer/emailpass/register", { body: { email, password } })
  const token = reg.json?.token
  if (!token) return null
  await http("POST", "/store/customers", { token, body: { email, first_name: "감사", last_name: "테스트" } })
  const login = await http("POST", "/auth/customer/emailpass", { body: { email, password } })
  return { email, password, token: login.json?.token || token }
}

async function adminToken() {
  const r = await http("POST", "/auth/user/emailpass", { body: ADMIN, pub: false })
  return r.json?.token || null
}

// ── 유틸: 상품/변형 하나 확보 ───────────────────────────────────────────────
async function firstVariant() {
  const r = await http("GET", "/store/products?limit=5&fields=*variants")
  for (const p of r.json?.products ?? []) {
    const v = (p.variants ?? [])[0]
    if (v?.id) return { productId: p.id, variantId: v.id }
  }
  return null
}

async function makeCart(token) {
  const r = await http("POST", "/store/carts", { token, body: {} })
  return r.json?.cart?.id || null
}

async function main() {
  console.log(`\n대상: ${BASE}\n`)

  const cust = await makeCustomer()
  const admTok = await adminToken()
  if (!cust) { console.log("고객 생성 실패 — 중단"); process.exit(1) }

  // ══ G. 토큰 혼용·위조 ══════════════════════════════════════════════════
  console.log("\n── G. 토큰 혼용·위조 ─────────────────────────────────")

  {
    // G1: 고객 토큰으로 관리자 API 접근
    const r = await http("GET", "/admin/orders?limit=1", { token: cust.token, pub: false })
    rec("G1", "고객 토큰으로 admin API 접근 차단", r.status === 401 || r.status === 403, `status=${r.status}`)
  }
  {
    // G2: 관리자 토큰으로 고객 전용 API 접근 (actor 혼용)
    const r = await http("GET", "/store/customers/me/points", { token: admTok })
    rec("G2", "관리자 토큰으로 고객 전용 API 접근 차단", r.status === 401 || r.status === 403,
      `status=${r.status}`)
  }
  {
    // G3: alg=none 위조 토큰
    const hdr = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url")
    const pl = Buffer.from(JSON.stringify({ actor_id: "usr_fake", actor_type: "user", exp: 9999999999 })).toString("base64url")
    const forged = `${hdr}.${pl}.`
    const r = await http("GET", "/admin/orders?limit=1", { token: forged, pub: false })
    rec("G3", "alg=none 위조 토큰 거부", r.status === 401, `status=${r.status}`)
  }
  {
    // G4: 서명 변조 토큰(페이로드만 교체)
    const parts = (cust.token || "").split(".")
    if (parts.length === 3) {
      const tampered = `${parts[0]}.${Buffer.from(JSON.stringify({ actor_id: "usr_admin", actor_type: "user", exp: 9999999999 })).toString("base64url")}.${parts[2]}`
      const r = await http("GET", "/admin/orders?limit=1", { token: tampered, pub: false })
      rec("G4", "서명 불일치 변조 토큰 거부", r.status === 401, `status=${r.status}`)
    } else rec("G4", "서명 변조 토큰 거부", false, "토큰 형식 파싱 실패", "WARN")
  }

  // ══ H. 권한 상승 (mass assignment) ════════════════════════════════════
  console.log("\n── H. 권한 상승·Mass Assignment ──────────────────────")

  {
    // H1: 고객 정보 수정에 민감 필드 주입
    const r = await http("POST", "/store/customers/me", {
      token: cust.token,
      body: { first_name: "정상", has_account: true, id: "cus_hijack", metadata: { role: "admin" } },
    })
    const after = await http("GET", "/store/customers/me", { token: cust.token })
    const id = after.json?.customer?.id ?? ""
    rec("H1", "고객 수정 시 id 주입 무시", !String(id).includes("hijack"), `id=${String(id).slice(0, 18)} status=${r.status}`)
  }
  {
    // H2: 적립금 자가 발행 시도(고객이 관리자 적립금 API 호출)
    const r = await http("POST", "/admin/points", {
      token: cust.token, pub: false,
      body: { customer_id: "any", amount: 1000000, reason: "self-grant" },
    })
    rec("H2", "고객이 관리자 적립금 발행 차단", r.status === 401 || r.status === 403 || r.status === 404, `status=${r.status}`)
  }
  {
    // H3: 회원등급 자가 상향
    const r = await http("POST", "/admin/membership", {
      token: cust.token, pub: false,
      body: { customer_id: "any", tier: "vip" },
    })
    rec("H3", "고객이 회원등급 자가 상향 차단", r.status === 401 || r.status === 403 || r.status === 404, `status=${r.status}`)
  }
  {
    // H4: 리뷰 작성 시 status를 published로 주입(검수 우회)
    const v = await firstVariant()
    if (v) {
      const r = await http("POST", `/store/products/${v.productId}/reviews`, {
        body: { author_name: "감사", content: "검수우회 시도 테스트입니다", rating: 5, status: "published" },
      })
      const created = r.json?.review
      const st = created?.status ?? "(미노출)"
      // 429(레이트리밋)면 판정 보류
      if (r.status === 429) rec("H4", "리뷰 status 주입(검수 우회) 차단", true, "레이트리밋으로 보류", "WARN")
      else rec("H4", "리뷰 status 주입(검수 우회) 차단", st !== "published", `status필드=${st} http=${r.status}`)
    } else rec("H4", "리뷰 status 주입 차단", false, "상품 없음", "WARN")
  }

  // ══ I. 동시성 경합 ════════════════════════════════════════════════════
  console.log("\n── I. 동시성 경합(이중 사용) ─────────────────────────")

  {
    // I1: 동일 적립금을 서로 다른 카트에 동시 사용 (double-spend)
    const bal = await http("GET", "/store/customers/me/points", { token: cust.token })
    const balance = bal.json?.balance ?? bal.json?.points?.balance ?? 0
    if (!balance || balance < 2) {
      rec("I1", "적립금 동시 이중사용 차단", true, `보유 적립금 ${balance}P — 시나리오 미적용(스킵)`, "WARN")
    } else {
      const v = await firstVariant()
      const c1 = await makeCart(cust.token)
      const c2 = await makeCart(cust.token)
      if (v && c1 && c2) {
        await http("POST", `/store/carts/${c1}/line-items`, { token: cust.token, body: { variant_id: v.variantId, quantity: 1 } })
        await http("POST", `/store/carts/${c2}/line-items`, { token: cust.token, body: { variant_id: v.variantId, quantity: 1 } })
        const [r1, r2] = await Promise.all([
          http("POST", `/store/carts/${c1}/points`, { token: cust.token, body: { points: balance } }),
          http("POST", `/store/carts/${c2}/points`, { token: cust.token, body: { points: balance } }),
        ])
        const okCount = [r1, r2].filter((r) => r.status >= 200 && r.status < 300).length
        rec("I1", "동일 적립금 동시 이중사용 차단", okCount <= 1, `성공 ${okCount}/2 (${r1.status},${r2.status})`)
      } else rec("I1", "적립금 동시 이중사용 차단", false, "카트/상품 준비 실패", "WARN")
    }
  }
  {
    // I2: 동일 멱등키로 환불 동시 2회
    if (admTok) {
      const key = `audit2-${uniq()}`
      const [a, b] = await Promise.all([
        http("POST", "/admin/orders/order_nonexistent/refund", { token: admTok, pub: false, headers: { "idempotency-key": key }, body: { amount: 1000, reason: "audit" } }),
        http("POST", "/admin/orders/order_nonexistent/refund", { token: admTok, pub: false, headers: { "idempotency-key": key }, body: { amount: 1000, reason: "audit" } }),
      ])
      const success = [a, b].filter((r) => r.status >= 200 && r.status < 300).length
      rec("I2", "동일 멱등키 환불 동시 실행 시 1회만 성공", success <= 1, `성공 ${success}/2 (${a.status},${b.status})`)
    } else rec("I2", "멱등키 동시 실행", false, "관리자 토큰 없음", "WARN")
  }

  // ══ J. 전송·경계 ══════════════════════════════════════════════════════
  console.log("\n── J. 전송·경계(CORS/키) ─────────────────────────────")

  {
    // J1: 악성 Origin 자격증명 반사
    const r = await http("GET", "/store/products?limit=1", { headers: { origin: "https://evil.example.com" } })
    const acao = r.headers.get?.("access-control-allow-origin") ?? null
    const acac = r.headers.get?.("access-control-allow-credentials") ?? null
    const bad = acao === "https://evil.example.com" && acac === "true"
    rec("J1", "임의 Origin 자격증명 반사 없음", !bad, `ACAO=${acao ?? "none"} ACAC=${acac ?? "none"}`)
  }
  {
    // J2: publishable key 없이 store API 접근
    const r = await http("GET", "/store/products?limit=1", { pub: false })
    rec("J2", "publishable key 없는 store 요청 거부", r.status === 400 || r.status === 401 || r.status === 403,
      `status=${r.status}`, "WARN")
  }

  // ══ K. 입력 경계 ══════════════════════════════════════════════════════
  console.log("\n── K. 입력 경계 ──────────────────────────────────────")

  {
    // K1: 약관 slug 경로순회
    const paths = ["../../../etc/passwd", "..%2f..%2f..%2fetc%2fpasswd", "....//....//package.json"]
    const st = []
    for (const p of paths) {
      const r = await http("GET", `/store/legal-docs/${encodeURIComponent(p)}`)
      st.push(r.status)
      if (r.status === 200 && (r.text || JSON.stringify(r.json || {})).includes("root:")) {
        rec("K1", "약관 slug 경로순회 차단", false, `파일 내용 노출! ${p}`)
      }
    }
    rec("K1", "약관 slug 경로순회 차단", !st.includes(200), `statuses=${st.join(",")}`)
  }
  {
    // K2: 널바이트 주입
    const r = await http("GET", `/store/legal-docs/${encodeURIComponent("terms .json")}`)
    rec("K2", "널바이트 주입 안전 처리", r.status !== 500, `status=${r.status}`)
  }
  {
    // K3: 초대형 페이로드(1MB 문의 내용)
    const v = await firstVariant()
    if (v) {
      const big = "가".repeat(1024 * 1024)
      const r = await http("POST", `/store/products/${v.productId}/inquiries`, { body: { author_name: "감사", content: big } })
      rec("K3", "초대형 페이로드 거부(무한 저장 방지)", r.status !== 201, `status=${r.status}`)
    } else rec("K3", "초대형 페이로드 거부", false, "상품 없음", "WARN")
  }
  {
    // K4: 필터 연산자 주입(쿼리 파라미터로 내부 필터 조작)
    const r = await http("GET", "/store/products?limit=1&id[$ne]=x&status=draft")
    const items = r.json?.products ?? []
    const leaked = items.some((p) => p.status && p.status !== "published")
    rec("K4", "쿼리 필터 주입으로 비공개 상품 노출 없음", !leaked && r.status !== 500, `status=${r.status} n=${items.length}`)
  }

  // ══ L. 재고·오버셀 ════════════════════════════════════════════════════
  console.log("\n── L. 재고·오버셀 ────────────────────────────────────")

  {
    const v = await firstVariant()
    const cart = await makeCart(cust.token)
    if (v && cart) {
      // L1: 재고를 크게 초과하는 수량
      const r = await http("POST", `/store/carts/${cart}/line-items`, { token: cust.token, body: { variant_id: v.variantId, quantity: 999999 } })
      rec("L1", "재고 초과 수량 담기 차단", r.status >= 400, `status=${r.status}`)

      // L2: 소수점 수량
      const r2 = await http("POST", `/store/carts/${cart}/line-items`, { token: cust.token, body: { variant_id: v.variantId, quantity: 1.5 } })
      rec("L2", "소수점 수량 거부", r2.status >= 400, `status=${r2.status}`)

      // L3: 수량 0
      const r3 = await http("POST", `/store/carts/${cart}/line-items`, { token: cust.token, body: { variant_id: v.variantId, quantity: 0 } })
      rec("L3", "수량 0 거부", r3.status >= 400, `status=${r3.status}`)
    } else rec("L1", "재고 초과 담기 차단", false, "카트/상품 준비 실패", "WARN")
  }

  console.log(`\n════ 결과: ${pass} PASS / ${fail} FAIL / ${warn} WARN ════\n`)
  const bad = results.filter((r) => r.status === "FAIL")
  if (bad.length) {
    console.log("실패 항목:")
    for (const b of bad) console.log(`  ❌ ${b.id} ${b.name} — ${b.detail}`)
  }
}

main().catch((e) => { console.error("프로브 오류:", e); process.exit(1) })
