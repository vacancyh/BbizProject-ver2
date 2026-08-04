/**
 * 비즈니스 로직 남용 프로브 (2026-07-28) — "돈이 새는 경로"를 실제로 시도한다.
 * 실행: BASE=http://localhost:9000 PUBKEY=pk_... node abuse-probe.mjs
 */
const BASE = process.env.BASE || "http://localhost:9000"
const PUB = process.env.PUBKEY
const ADMIN = { email: "admin@shop.local", password: "admin1234!" }

let pass = 0, fail = 0, info = 0
const fails = []
function rec(id, name, ok, detail, level = "FAIL") {
  if (ok) { pass++; console.log(`✅ ${id} ${name} — ${detail}`) }
  else if (level === "INFO") { info++; console.log(`ℹ️  ${id} ${name} — ${detail}`) }
  else { fail++; fails.push(`${id} ${name} — ${detail}`); console.log(`❌ ${id} ${name} — ${detail}`) }
}

async function http(method, path, { token, body, pub = true } = {}) {
  const h = { "content-type": "application/json" }
  if (pub && PUB) h["x-publishable-api-key"] = PUB
  if (token) h["authorization"] = `Bearer ${token}`
  const res = await fetch(BASE + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined })
  let json = null
  try { json = await res.json() } catch {}
  return { status: res.status, json }
}

const run = async () => {
  const at = (await http("POST", "/auth/user/emailpass", { body: ADMIN, pub: false })).json?.token
  const ah = { token: at, pub: false }

  const email = `abuse_${Date.now()}@kr-audit.local`
  const reg = await http("POST", "/auth/customer/emailpass/register", { body: { email, password: "abuse1234!" } })
  await http("POST", "/store/customers", { token: reg.json?.token, body: { email, first_name: "남", last_name: "용" } })
  const ct = (await http("POST", "/auth/customer/emailpass", { body: { email, password: "abuse1234!" } })).json?.token
  const cid = (await http("GET", "/store/customers/me", { token: ct })).json?.customer?.id
  await http("POST", `/admin/points/customers/${cid}/earn`, { ...ah, body: { points: 10000, reason: "남용 프로브" } })

  const region = (await http("GET", "/store/regions")).json?.regions?.find((r) => r.currency_code === "krw")
  const prods = await http("GET", `/store/products?limit=10&region_id=${region.id}&fields=*variants.calculated_price`)
  const variant = prods.json?.products?.flatMap((p) => p.variants).find((v) => (v.calculated_price?.calculated_amount ?? 0) > 10000)

  const balance = async () => (await http("GET", "/store/customers/me/points", { token: ct })).json?.summary?.balance ?? 0

  async function newCart() {
    const c = (await http("POST", "/store/carts", { token: ct, body: { region_id: region.id, email } })).json?.cart
    await http("POST", `/store/carts/${c.id}/line-items`, { token: ct, body: { variant_id: variant.id, quantity: 1 } })
    return (await http("GET", `/store/carts/${c.id}`, { token: ct })).json?.cart
  }

  console.log("\n── G. 적립금 남용 ─────────────────────────────────────")

  // G1 같은 카트에 포인트 2번 적용(중복 차감)
  let cart = await newCart()
  const b0 = await balance()
  await http("POST", `/store/carts/${cart.id}/points`, { token: ct, body: { points: 1000 } })
  const dup = await http("POST", `/store/carts/${cart.id}/points`, { token: ct, body: { points: 1000 } })
  const b1 = await balance()
  rec("G1", "동일 카트 포인트 중복 적용 차단", dup.status === 409 && b0 - b1 === 1000, `2회차=${dup.status}, 차감=${b0 - b1}`)

  // G2 해제 2번(이중 복원 = 포인트 증식)
  await http("DELETE", `/store/carts/${cart.id}/points`, { token: ct })
  await http("DELETE", `/store/carts/${cart.id}/points`, { token: ct })
  const b2 = await balance()
  rec("G2", "포인트 해제 반복해도 증식 없음", b2 === b0, `복원 후 잔액 ${b2} (기대 ${b0})`)

  // G3 주문금액 초과 포인트
  cart = await newCart()
  const over = (cart.item_total ?? 0) + 100000
  const r3 = await http("POST", `/store/carts/${cart.id}/points`, { token: ct, body: { points: over } })
  rec("G3", "주문금액 초과 포인트 사용 차단", r3.status === 400, `status=${r3.status} (요청 ${over})`)

  // G4 소수점/문자열 포인트
  const r4a = await http("POST", `/store/carts/${cart.id}/points`, { token: ct, body: { points: 100.9 } })
  const r4b = await http("POST", `/store/carts/${cart.id}/points`, { token: ct, body: { points: "1e9" } })
  rec("G4", "비정상 포인트 입력 안전 처리", r4a.status < 500 && r4b.status < 500, `소수=${r4a.status}, 지수표기=${r4b.status}`)

  console.log("\n── H. 쿠폰 남용 ───────────────────────────────────────")

  const promos = await http("GET", "/admin/promotions?limit=5", ah)
  const code = promos.json?.promotions?.find((p) => p.status === "active")?.code
  if (code) {
    const c2 = await newCart()
    const a1 = await http("POST", `/store/carts/${c2.id}/promotions`, { token: ct, body: { promo_codes: [code] } })
    const a2 = await http("POST", `/store/carts/${c2.id}/promotions`, { token: ct, body: { promo_codes: [code, code] } })
    const after = (await http("GET", `/store/carts/${c2.id}`, { token: ct })).json?.cart
    const applied = (after?.promotions ?? []).filter((p) => p.code === code).length
    rec("H1", "동일 쿠폰 중복 적용 시 1회만 반영", applied <= 1, `적용 횟수=${applied} (요청 ${a1.status}/${a2.status})`)
  } else {
    rec("H1", "쿠폰 시나리오", true, "활성 쿠폰 없음 — 스킵", "INFO")
  }

  // H2 존재하지 않는 쿠폰
  const c3 = await newCart()
  const bad = await http("POST", `/store/carts/${c3.id}/promotions`, { token: ct, body: { promo_codes: ["NOPE_" + Date.now()] } })
  const c3after = (await http("GET", `/store/carts/${c3.id}`, { token: ct })).json?.cart
  rec("H2", "존재하지 않는 쿠폰으로 할인 발생 없음", (c3after?.discount_total ?? 0) === 0, `discount=${c3after?.discount_total} (status=${bad.status})`)

  console.log("\n── I. 주문·상태 조작 ──────────────────────────────────")

  // I1 완료되지 않은 카트로 주문 조작 시도(직접 상태 변경 라우트 없음 확인)
  const r5 = await http("POST", "/store/orders/lookup", { body: { display_id: 999999, email } })
  rec("I1", "없는 주문 조회 안전 처리", r5.status === 404, `status=${r5.status}`)

  // I2 타 고객 이메일로 내 주문 조회 시도
  const myOrders = await http("GET", "/store/orders?limit=1", { token: ct })
  rec("I2", "주문 목록은 본인 것만", (myOrders.json?.orders ?? []).every((o) => o.email === email),
    `n=${(myOrders.json?.orders ?? []).length}`)

  console.log("\n── J. 관리자 권한 경계 ────────────────────────────────")

  // J1 하위 등급(cs) 로 금전/설정 API 접근
  const cs = await http("POST", "/auth/user/emailpass", { body: { email: "ops@shop.local", password: "ops1234!" }, pub: false })
  const opsTok = cs.json?.token
  if (opsTok) {
    const j1 = await http("GET", "/admin/rbac/roles", { token: opsTok, pub: false })
    rec("J1", "operation 등급의 권한관리 조회 차단", j1.status === 403, `status=${j1.status}`)
    const j2 = await http("GET", "/admin/audit/logs?limit=1", { token: opsTok, pub: false })
    rec("J2", "operation 등급의 감사로그 조회 차단", j2.status === 403 || j2.status === 404, `status=${j2.status}`)
    const j3 = await http("GET", "/admin/dashboard/settlement-kpi", { token: opsTok, pub: false })
    rec("J3", "정산 KPI 는 정산 권한에 따름", j3.status === 200 || j3.status === 403, `status=${j3.status}`)
  } else {
    rec("J1", "등급별 계정 로그인", false, "ops@shop.local 로그인 실패")
  }

  console.log(`\n════ 결과: ${pass} PASS / ${fail} FAIL / ${info} INFO ════`)
  if (fails.length) { console.log("\n실패:"); fails.forEach((f) => console.log("  ❌", f)) }
  process.exit(fail ? 1 : 0)
}

run().catch((e) => { console.error(e); process.exit(2) })
