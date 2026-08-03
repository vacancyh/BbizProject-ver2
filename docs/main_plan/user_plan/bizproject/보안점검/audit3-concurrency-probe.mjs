/**
 * 동시성(경합) 회귀 프로브 (2026-08-03 신설)
 *
 * 2026-08-03 점검에서 **실제 돈이 새는 경합 결함 3건**을 찾았다. 전부 같은 유형이다:
 *   "검사 → (락 없음) → 집행" 사이에 다른 요청이 끼어든다(TOCTOU).
 *
 *   ① 적립금 이중 사용   : 락 키가 카트 단위였다. 카트를 여러 개 만들어 동시에 요청하면
 *                          10,000P 로 30,000원 할인, 잔액 -20,000P 가 됐다.
 *   ② 환불 이중 집행     : 멱등키 검사에 락이 없었다. 동일 nonce 동시 3건 →
 *                          refund 레코드 3행(1,000원 × 3) 실제 생성.
 *   ③ 취소 이중 집행     : 환불과 동일 구조. 게다가 만료된 멱등키는 재실행까지 허용했다.
 *
 * 이 프로브는 세 경로를 **동시 요청으로 직접 때려서** 방어가 살아있는지 확인한다.
 * 단위 테스트로는 잡히지 않는 종류라(프로세스 간 경합), 실제 서버를 상대로 돌려야 한다.
 *
 * 실행: BASE=http://localhost:9000 PUBKEY=pk_... node audit3-concurrency-probe.mjs
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

const H = (t, pub = true) => {
  const h = { "content-type": "application/json" }
  if (pub && PUB) h["x-publishable-api-key"] = PUB
  if (t) h.authorization = `Bearer ${t}`
  return h
}
const j = async (m, p, { t, b, pub = true } = {}) => {
  const r = await fetch(BASE + p, { method: m, headers: H(t, pub), body: b ? JSON.stringify(b) : undefined })
  let d = null
  try { d = await r.json() } catch {}
  return { s: r.status, d }
}
const uniq = () => Math.random().toString(36).slice(2, 9)
const ok2xx = (r) => r.s >= 200 && r.s < 300

async function newCustomer() {
  const email = `conc_${uniq()}@kr-audit.local`, password = "concpass1234!"
  const reg = await j("POST", "/auth/customer/emailpass/register", { b: { email, password } })
  if (!reg.d?.token) return null
  await j("POST", "/store/customers", { t: reg.d.token, b: { email, first_name: "경합", last_name: "검증" } })
  const login = await j("POST", "/auth/customer/emailpass", { b: { email, password } })
  const token = login.d?.token
  const me = await j("GET", "/store/customers/me", { t: token })
  return { email, token, id: me.d?.customer?.id }
}

async function pickVariant(regionId) {
  const pr = await j("GET", `/store/products?limit=10&region_id=${regionId}&fields=*variants,*variants.calculated_price`)
  let vid = null, price = 0
  for (const p of pr.d?.products ?? []) {
    for (const v of p.variants ?? []) {
      const cp = v.calculated_price?.calculated_amount
      if (cp > price) { price = cp; vid = v.id }
    }
  }
  return { vid, price }
}

/** 게스트 주문 1건 생성 → 결제 capture 까지 완료된 주문 id 반환 */
async function placeCapturedOrder(adminToken, regionId, variantId) {
  const c = await j("POST", "/store/carts", { b: { region_id: regionId, email: `ord_${uniq()}@kr-audit.local` } })
  const cid = c.d?.cart?.id
  if (!cid) return null
  await j("POST", `/store/carts/${cid}/line-items`, { b: { variant_id: variantId, quantity: 1 } })
  const addr = { first_name: "감사", last_name: "테스트", address_1: "서울시 강남구 1", city: "서울", postal_code: "06000", country_code: "kr", phone: "010-0000-0000" }
  await j("POST", `/store/carts/${cid}`, { b: { shipping_address: addr, billing_address: addr } })
  const so = await j("GET", `/store/shipping-options?cart_id=${cid}`)
  const opt = (so.d?.shipping_options ?? [])[0]
  if (opt) await j("POST", `/store/carts/${cid}/shipping-methods`, { b: { option_id: opt.id } })
  const pp = await j("GET", `/store/payment-providers?region_id=${regionId}`)
  const prov = (pp.d?.payment_providers ?? [])[0]
  await j("POST", "/store/payment-collections", { b: { cart_id: cid } })
  const cart2 = await j("GET", `/store/carts/${cid}`)
  const pcid = cart2.d?.cart?.payment_collection?.id
  if (pcid && prov) await j("POST", `/store/payment-collections/${pcid}/payment-sessions`, { b: { provider_id: prov.id } })
  const done = await j("POST", `/store/carts/${cid}/complete`, {})
  const order = done.d?.order
  if (!order?.id) return null
  const od = await j("GET", `/admin/orders/${order.id}?fields=*payment_collections,*payment_collections.payments`, { t: adminToken, pub: false })
  let pay = null
  for (const pc of od.d?.order?.payment_collections ?? []) for (const p of pc.payments ?? []) pay = p
  if (pay && !pay.captured_at) {
    await j("POST", `/admin/payments/${pay.id}/capture`, { t: adminToken, pub: false, b: { amount: order.total } })
  }
  return { id: order.id, total: order.total, paymentId: pay?.id }
}

async function main() {
  console.log(`\n대상: ${BASE}\n`)
  const adm = (await j("POST", "/auth/user/emailpass", { b: ADMIN, pub: false })).d?.token
  if (!adm) { console.log("관리자 로그인 실패 — 중단"); process.exit(1) }
  const regionId = (await j("GET", "/store/regions")).d?.regions?.[0]?.id
  const { vid } = await pickVariant(regionId)
  if (!vid) { console.log("판매 가능한 variant 없음 — 중단"); process.exit(1) }

  // ══ ① 적립금 동시 이중 사용 ═════════════════════════════════════════════
  console.log("── ① 적립금 동시 이중 사용 ───────────────────────────")
  {
    const cust = await newCustomer()
    const GRANT = 10000, USE = 2000, N = 8
    await j("POST", `/admin/points/customers/${cust.id}/earn`, { t: adm, pub: false, b: { points: GRANT, reason: "concurrency-probe" } })
    const bal0 = (await j("GET", "/store/customers/me/points", { t: cust.token })).d?.summary?.balance ?? 0

    const carts = []
    for (let i = 0; i < N; i++) {
      const c = await j("POST", "/store/carts", { t: cust.token, b: { region_id: regionId } })
      const id = c.d?.cart?.id
      await j("POST", `/store/carts/${id}/line-items`, { t: cust.token, b: { variant_id: vid, quantity: 1 } })
      carts.push(id)
    }
    const rs = await Promise.all(carts.map((id) => j("POST", `/store/carts/${id}/points`, { t: cust.token, b: { points: USE } })))
    const okN = rs.filter(ok2xx).length
    const bal1 = (await j("GET", "/store/customers/me/points", { t: cust.token })).d?.summary?.balance ?? 0
    const expected = Math.floor(bal0 / USE)

    rec("C1", "보유 한도를 넘는 동시 사용 차단", okN === expected,
      `성공 ${okN}/${N} (기대 ${expected}) · 잔액 ${bal1}`)
    rec("C2", "적립금 잔액이 음수가 되지 않음", bal1 >= 0, `잔액=${bal1}`)
    rec("C3", "차감액과 성공 건수가 정합", bal0 - bal1 === okN * USE,
      `차감 ${bal0 - bal1} vs 성공×사용액 ${okN * USE}`)
  }

  // ══ ② 환불 동시 이중 집행 ═══════════════════════════════════════════════
  console.log("\n── ② 환불 동시 이중 집행 ─────────────────────────────")
  {
    const order = await placeCapturedOrder(adm, regionId, vid)
    if (!order) {
      rec("C4", "동일 멱등키 환불 동시 요청", false, "테스트 주문 생성 실패", "WARN")
    } else {
      const nonce = `probe-${uniq()}`
      const body = { nonce, amount: 1000, refund_method: "account", account_info: { bank: "테스트", number: "000", holder: "감사" } }
      const rs = await Promise.all([1, 2, 3, 4, 5].map(() => j("POST", `/admin/orders/${order.id}/refund`, { t: adm, pub: false, b: body })))
      const okN = rs.filter(ok2xx).length
      const cached = rs.filter((r) => r.s === 409).length
      rec("C4", "동일 멱등키 환불은 1회만 집행", okN === 1, `성공 ${okN}/5 · 409(중복) ${cached}`)

      // 만료 여부와 무관하게 재집행 금지(fail-closed)
      const again = await j("POST", `/admin/orders/${order.id}/refund`, { t: adm, pub: false, b: body })
      rec("C5", "동일 멱등키 재요청은 재집행 없이 409", again.s === 409, `status=${again.s}`)
    }
  }

  // ══ ③ 취소 동시 이중 집행 ═══════════════════════════════════════════════
  console.log("\n── ③ 강제취소 동시 이중 집행 ─────────────────────────")
  {
    const order = await placeCapturedOrder(adm, regionId, vid)
    if (!order) {
      rec("C6", "동시 강제취소 1회만 집행", false, "테스트 주문 생성 실패", "WARN")
    } else {
      // nonce 없이(= 멱등키 없이) 동시 요청해도 주문 단위 락으로 막혀야 한다.
      const body = { reason: "other", confirm: true }
      const rs = await Promise.all([1, 2, 3, 4].map(() => j("POST", `/admin/orders-kr/${order.id}/cancel`, { t: adm, pub: false, b: body })))
      const okN = rs.filter(ok2xx).length
      rec("C6", "nonce 없는 동시 강제취소도 1회만 집행", okN === 1, `성공 ${okN}/4`)
    }
  }

  console.log(`\n════ 결과: ${pass} PASS / ${fail} FAIL / ${warn} WARN ════\n`)
  const bad = results.filter((r) => r.status === "FAIL")
  if (bad.length) {
    console.log("실패 항목:")
    for (const b of bad) console.log(`  ❌ ${b.id} ${b.name} — ${b.detail}`)
    process.exitCode = 1
  }
}

main().catch((e) => { console.error("프로브 오류:", e); process.exit(1) })
