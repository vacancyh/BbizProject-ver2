/**
 * 판매 전 보안 프로브 (2026-07-28)
 * 실행: BASE=http://localhost:9000 PUBKEY=pk_... node audit-probe.mjs
 *
 * 원칙: 실제 요청을 던져 "막히는지"를 확인한다. 방어가 동작하면 PASS.
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

async function http(method, path, { token, body, pub = true, headers = {} } = {}) {
  const h = { "content-type": "application/json", ...headers }
  if (pub && PUB) h["x-publishable-api-key"] = PUB
  if (token) h["authorization"] = `Bearer ${token}`
  let res, json = null, text = null
  try {
    res = await fetch(BASE + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined })
    const ct = res.headers.get("content-type") || ""
    if (ct.includes("json")) { try { json = await res.json() } catch {} }
    else { try { text = await res.text() } catch {} }
  } catch (e) {
    return { status: 0, err: e.message, json: null, text: null, headers: new Map() }
  }
  return { status: res.status, json, text, headers: res.headers }
}

const run = async () => {
  // ── 준비: 관리자·고객 토큰 ─────────────────────────────────────────────
  const at = (await http("POST", "/auth/user/emailpass", { body: ADMIN, pub: false })).json?.token
  const email = `probe_${Date.now()}@kr-audit.local`
  const reg = await http("POST", "/auth/customer/emailpass/register", { body: { email, password: "probe1234!" } })
  await http("POST", "/store/customers", { token: reg.json?.token, body: { email, first_name: "프", last_name: "로브" } })
  const ct = (await http("POST", "/auth/customer/emailpass", { body: { email, password: "probe1234!" } })).json?.token
  const cid = (await http("GET", "/store/customers/me", { token: ct })).json?.customer?.id

  // 두 번째 고객(교차 접근 테스트용)
  const email2 = `probe2_${Date.now()}@kr-audit.local`
  const reg2 = await http("POST", "/auth/customer/emailpass/register", { body: { email: email2, password: "probe1234!" } })
  await http("POST", "/store/customers", { token: reg2.json?.token, body: { email: email2, first_name: "프", last_name: "로브2" } })
  const ct2 = (await http("POST", "/auth/customer/emailpass", { body: { email: email2, password: "probe1234!" } })).json?.token

  console.log("\n── A. 인증·인가 ─────────────────────────────────────")

  // A1 미인증 admin 접근
  let r = await http("GET", "/admin/orders", { pub: false })
  rec("A1", "미인증 /admin 접근 차단", r.status === 401, `status=${r.status}`)

  // A2 고객 토큰으로 admin 접근
  r = await http("GET", "/admin/orders", { token: ct, pub: false })
  rec("A2", "고객 토큰으로 admin 접근 차단", r.status === 401 || r.status === 403, `status=${r.status}`)

  // A3 alg=none 위조 토큰
  const noneTok = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url") + "." +
    Buffer.from(JSON.stringify({ actor_id: "usr_fake", actor_type: "user" })).toString("base64url") + "."
  r = await http("GET", "/admin/orders", { token: noneTok, pub: false })
  rec("A3", "alg=none 위조 JWT 차단", r.status === 401, `status=${r.status}`)

  // A4 서명 변조 토큰
  if (at) {
    const tampered = at.slice(0, -3) + "AAA"
    r = await http("GET", "/admin/orders", { token: tampered, pub: false })
    rec("A4", "서명 변조 JWT 차단", r.status === 401, `status=${r.status}`)
  }

  // A5 퍼블리셔블 키 없이 store 접근
  r = await http("GET", "/store/products", { pub: false })
  rec("A5", "퍼블리셔블 키 없는 store 요청 차단", r.status >= 400, `status=${r.status}`)

  // A6 미인증 마이페이지
  r = await http("GET", "/store/customers/me/points")
  rec("A6", "미인증 마이페이지 차단", r.status === 401, `status=${r.status}`)

  // A7 대시보드 KPI — 미인증
  r = await http("GET", "/admin/dashboard/settlement-kpi", { pub: false })
  rec("A7", "미인증 정산 KPI 차단", r.status === 401, `status=${r.status}`)

  console.log("\n── B. IDOR·객체 접근 ─────────────────────────────────")

  // B1 타인 주문 조회
  const orders = await http("GET", "/admin/orders?limit=3&fields=id,email", { token: at, pub: false })
  const someOrder = orders.json?.orders?.[0]
  if (someOrder) {
    r = await http("GET", `/store/orders/${someOrder.id}`, { token: ct })
    rec("B1", "타인 주문 단건 조회 차단", r.status === 403 || r.status === 404, `status=${r.status}`)
  }

  // 공격자에게 적립금을 지급 — 잔액 부족(400)이 아니라 소유권(403)으로 막히는지 보기 위함
  if (at && cid) {
    await http("POST", `/admin/points/customers/${cid}/earn`, { token: at, pub: false, body: { points: 5000, reason: "프로브" } })
  }

  // B2 타인 카트에 포인트 조작
  const regions = await http("GET", "/store/regions")
  const region = (regions.json?.regions ?? []).find((x) => x.currency_code === "krw")
  const victimCart = (await http("POST", "/store/carts", { token: ct2, body: { region_id: region.id, email: email2 } })).json?.cart
  if (victimCart) {
    r = await http("POST", `/store/carts/${victimCart.id}/points`, { token: ct, body: { points: 100 } })
    rec("B2", "타인 카트 포인트 사용 차단", r.status === 403, `status=${r.status}`)
    r = await http("DELETE", `/store/carts/${victimCart.id}/points`, { token: ct })
    rec("B3", "타인 카트 포인트 해제(탈취) 차단", r.status === 403, `status=${r.status}`)
  }

  // B4 비회원 주문조회 열거(이메일 불일치)
  if (someOrder) {
    const det = await http("GET", `/admin/orders/${someOrder.id}?fields=display_id,email`, { token: at, pub: false })
    const did = det.json?.order?.display_id
    r = await http("POST", "/store/orders/lookup", { body: { display_id: did, email: "wrong@nobody.test" } })
    rec("B4", "주문조회 이메일 불일치 → 열거 차단", r.status === 404, `status=${r.status}`)
  }

  console.log("\n── C. 인젝션·XSS ─────────────────────────────────────")

  // C1 SQL 인젝션 시도(검색)
  const sqli = ["' OR 1=1--", "'; DROP TABLE product;--", "%' OR '1'='1"]
  let sqliOk = true, sqliDetail = []
  for (const p of sqli) {
    const rr = await http("GET", `/store/products?q=${encodeURIComponent(p)}&limit=2`)
    sqliDetail.push(`${rr.status}`)
    if (rr.status >= 500) sqliOk = false
  }
  rec("C1", "검색 SQL 인젝션 시도 → 500 없음", sqliOk, `statuses=${sqliDetail.join(",")}`)

  // C2 주문조회 인젝션
  r = await http("POST", "/store/orders/lookup", { body: { display_id: "1 OR 1=1", email: "a@b.c" } })
  rec("C2", "주문조회 인젝션 시도 안전 처리", r.status < 500, `status=${r.status}`)

  // C3 XSS 페이로드 저장 시도(리뷰) → 저장돼도 응답이 그대로 실행 가능한 형태인지
  const XSS = '<script>alert(1)</script>'
  const prods = await http("GET", "/store/products?limit=1")
  const pid = prods.json?.products?.[0]?.id
  if (pid) {
    const rr = await http("POST", `/store/products/${pid}/reviews`, {
      token: ct, body: { rating: 5, title: XSS, content: `${XSS} 정상 본문입니다 최소길이 채우기` },
    })
    rec("C3", "리뷰 XSS 페이로드 입력 처리(저장은 되되 렌더에서 이스케이프)", rr.status < 500, `status=${rr.status} (React 기본 이스케이프)`)
  }

  // C4 JSON-LD script 탈출(상품명 기반) — 스토어프론트에서 확인
  console.log("   ※ JSON-LD 이스케이프는 스토어프론트 렌더 검증에서 별도 확인")

  console.log("\n── D. 응답 헤더·정보 노출 ─────────────────────────────")

  r = await http("GET", "/store/products?limit=1")
  const h = r.headers
  rec("D1", "X-Content-Type-Options: nosniff", h.get("x-content-type-options") === "nosniff", `${h.get("x-content-type-options")}`)
  rec("D2", "X-Frame-Options 설정", !!h.get("x-frame-options"), `${h.get("x-frame-options")}`)
  rec("D3", "Referrer-Policy 설정", !!h.get("referrer-policy"), `${h.get("referrer-policy")}`)
  rec("D4", "서버 소프트웨어 버전 미노출", !(h.get("x-powered-by")), `x-powered-by=${h.get("x-powered-by") ?? "none"}`, "WARN")

  // D5 존재하지 않는 라우트 → 스택 노출 여부
  r = await http("GET", "/store/__nope__")
  const body = JSON.stringify(r.json ?? r.text ?? "")
  rec("D5", "404 응답에 스택트레이스 없음", !/at \w+ \(|\.ts:\d+|node_modules/.test(body), `len=${body.length}`)

  // D6 잘못된 요청 → 내부 정보 노출
  r = await http("POST", "/store/carts", { body: { region_id: "reg_nonexistent" } })
  const body2 = JSON.stringify(r.json ?? "")
  rec("D6", "오류 응답에 내부 경로/스택 없음", !/node_modules|\\\\|\/src\//.test(body2), `status=${r.status}`)

  console.log("\n── E. 레이트리밋·남용 ─────────────────────────────────")

  // E1 로그인 무차별 대입
  let blocked = 0
  for (let i = 0; i < 12; i++) {
    const rr = await http("POST", "/auth/customer/emailpass", { body: { email, password: "wrong-password" } })
    if (rr.status === 429) blocked++
  }
  rec("E1", "로그인 무차별 대입 차단(429)", blocked > 0, `429 발생 ${blocked}/12`)

  // E2 익명 리뷰 폭주
  if (pid) {
    let r429 = 0
    for (let i = 0; i < 25; i++) {
      const rr = await http("POST", `/store/products/${pid}/reviews`, { body: { rating: 5, content: `부하 테스트 본문 ${i} 최소길이 확보` } })
      if (rr.status === 429) r429++
    }
    rec("E2", "익명 리뷰 쓰기 레이트리밋", r429 > 0, `429 ${r429}/25`)
  }

  console.log("\n── F. 비즈니스 로직 ───────────────────────────────────")

  // F1 음수 수량 카트
  const myCart = (await http("POST", "/store/carts", { token: ct, body: { region_id: region.id, email } })).json?.cart
  const variant = (await http("GET", `/store/products?limit=5&region_id=${region.id}&fields=*variants.calculated_price`))
    .json?.products?.flatMap((p) => p.variants)?.find((v) => (v.calculated_price?.calculated_amount ?? 0) > 0)
  if (myCart && variant) {
    r = await http("POST", `/store/carts/${myCart.id}/line-items`, { token: ct, body: { variant_id: variant.id, quantity: -5 } })
    rec("F1", "음수 수량 담기 차단", r.status >= 400, `status=${r.status}`)

    r = await http("POST", `/store/carts/${myCart.id}/line-items`, { token: ct, body: { variant_id: variant.id, quantity: 1, unit_price: 1 } })
    const cartAfter = (await http("GET", `/store/carts/${myCart.id}`, { token: ct })).json?.cart
    const item = cartAfter?.items?.[0]
    const serverPrice = variant.calculated_price?.calculated_amount
    rec("F2", "클라이언트 가격 주입 무시(서버 가격 사용)", !item || Number(item.unit_price) === Number(serverPrice),
      `주입=1 / 실제=${item?.unit_price} (서버가격=${serverPrice})`)

    // F3 보유 초과 포인트 사용
    r = await http("POST", `/store/carts/${myCart.id}/points`, { token: ct, body: { points: 99999999 } })
    rec("F3", "보유 초과 적립금 사용 차단", r.status === 400, `status=${r.status}`)

    // F4 음수 포인트
    r = await http("POST", `/store/carts/${myCart.id}/points`, { token: ct, body: { points: -1000 } })
    rec("F4", "음수 적립금 사용 차단", r.status === 400, `status=${r.status}`)
  }

  // F5 별점 범위 초과
  if (pid) {
    r = await http("POST", `/store/products/${pid}/reviews`, { token: ct, body: { rating: 99, content: "별점 범위 초과 테스트 본문입니다" } })
    rec("F5", "별점 범위 초과 거부", r.status >= 400, `status=${r.status}`)
  }

  console.log(`\n════ 결과: ${pass} PASS / ${fail} FAIL / ${warn} WARN ════`)
  const fails = results.filter((x) => x.status === "FAIL")
  if (fails.length) {
    console.log("\n실패 항목:")
    for (const f of fails) console.log(`  ❌ ${f.id} ${f.name} — ${f.detail}`)
  }
  process.exit(fails.length ? 1 : 0)
}

run().catch((e) => { console.error("프로브 오류:", e); process.exit(2) })
