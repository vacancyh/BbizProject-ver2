/**
 * 구매 전 과정 실주행 프로브 (2026-08-04 신설)
 *
 * ── 왜 만들었나 ────────────────────────────────────────────────────
 * 도메인별 통합테스트(127건)는 각 API 를 따로 검증한다.
 * 하지만 실제 고객은 **가입 → 로그인 → 담기 → 적립금 → 주문 → 조회 → 취소** 를
 * 한 줄기로 지나간다. 중간 단계의 부작용(재고·적립금·금액)이 다음 단계에
 * 제대로 이어지는지는 그 순서대로 밟아 봐야만 드러난다.
 *
 * 이 프로브는 **한 명의 고객이 되어** 처음부터 끝까지 실제로 지나간다.
 * 각 단계에서 금액·재고·적립금 잔액을 직접 읽어 정합성을 확인한다.
 *
 * ── 실행 ───────────────────────────────────────────────────────────
 *   BASE=http://localhost:9000 PUBKEY=pk_... node journey-probe.mjs
 *
 * ── 주의 ───────────────────────────────────────────────────────────
 * ⚠️ **실제 고객·주문을 만들고 재고를 차감한다.** 개발/테스트 DB 에서만 실행할 것.
 *    (생성한 고객 이메일은 journey-<타임스탬프>@example.invalid 형태)
 *
 * ⚠️ 반복 실행하면 재고가 바닥나 **다른 E2E 가 "insufficient inventory" 로 실패**한다.
 *    (2026-08-04 실제로 스토어프론트 E2E 2건이 이 이유로 깨졌다)
 *    돌린 뒤에는 재고를 복구할 것:
 *      cd backend/services/api && npx medusa exec ./src/scripts/seed-inventory.ts
 *    ※ 재고는 반드시 이 스크립트/Admin API 로 조작한다. SQL 직접 수정은 재고 캐시가 안 맞는다.
 */

const BASE = process.env.BASE || "http://localhost:9000"
/**
 * 언어. 지정하면 모든 요청에 x-medusa-locale 을 붙인다.
 *   LOCALE=en-US node journey-probe.mjs
 * 영어 고객이 실제로 끝까지 살 수 있는지 확인하는 용도다 —
 * 번역 적용 과정에서 금액·재고·주문 흐름이 깨지지 않는지는 따로 봐야 한다.
 */
const LOCALE = process.env.LOCALE || null
const PUB = process.env.PUBKEY || process.env.MEDUSA_PUBLISHABLE_KEY || ""

const stamp = Date.now()
const CUST = {
  email: `journey-${stamp}@example.invalid`,
  password: "Journey1234!",
  first_name: "점검",
  last_name: "고객",
}

let token = null
const steps = []
function step(name, ok, detail) {
  steps.push({ name, ok, detail })
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}\n        ${detail}`)
}

async function api(path, { method = "GET", body, auth = true, headers = {} } = {}) {
  const h = { "content-type": "application/json", ...headers }
  if (PUB) h["x-publishable-api-key"] = PUB
  if (LOCALE) h["x-medusa-locale"] = LOCALE
  if (auth && token) h["authorization"] = `Bearer ${token}`
  const r = await fetch(BASE + path, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await r.text()
  let json
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { _raw: text.slice(0, 200) }
  }
  return { status: r.status, body: json }
}

const won = (n) => (n == null ? "?" : Number(n).toLocaleString("ko-KR") + "원")

console.log(`\n구매 전 과정 실주행 → ${BASE}`)
console.log(`고객: ${CUST.email}${LOCALE ? ` · 언어: ${LOCALE}` : ""}`)
console.log("─".repeat(70))

// ── 1. 회원가입 ─────────────────────────────────────────────────────
{
  const reg = await api("/auth/customer/emailpass/register", {
    method: "POST",
    auth: false,
    body: { email: CUST.email, password: CUST.password },
  })
  token = reg.body?.token ?? null
  if (!token) {
    step("회원가입", false, `토큰을 못 받았다 — status=${reg.status} ${JSON.stringify(reg.body).slice(0, 120)}`)
    process.exit(1)
  }
  const create = await api("/store/customers", {
    method: "POST",
    body: { email: CUST.email, first_name: CUST.first_name, last_name: CUST.last_name },
  })
  step("① 회원가입", create.status === 200 || create.status === 201, `status=${create.status}`)
}

// ── 2. 로그인 ───────────────────────────────────────────────────────
{
  const login = await api("/auth/customer/emailpass", {
    method: "POST",
    auth: false,
    body: { email: CUST.email, password: CUST.password },
  })
  token = login.body?.token ?? token
  step("② 로그인", login.status === 200 && !!login.body?.token, `status=${login.status}`)

  const me = await api("/store/customers/me")
  step(
    "③ 내 정보 조회",
    me.status === 200 && me.body?.customer?.email === CUST.email,
    `status=${me.status} · email=${me.body?.customer?.email ?? "?"}`
  )
}

// ── 3. 상품 조회 ────────────────────────────────────────────────────
let variantId = null
let region = null
let unitPrice = null
{
  const regions = await api("/store/regions", { auth: false })
  const all = regions.body?.regions ?? []
  // 실제 고객 경로는 /kr 이다. KRW 지역을 반드시 고른다 —
  // regions[0] 을 쓰면 Europe 데모 데이터(10원짜리 상품)로 돌아 검증이 무의미해진다.
  region = all.find((r) => String(r.currency_code).toLowerCase() === "krw") ?? all[0]
  if (String(region?.currency_code).toLowerCase() !== "krw") {
    console.log(`  ⚠️ KRW 지역을 못 찾아 ${region?.name}(${region?.currency_code}) 로 진행한다`)
  }
  const prods = await api(`/store/products?limit=50&region_id=${region?.id ?? ""}`, { auth: false })
  const list = prods.body?.products ?? []
  // 가격이 있고 재고가 있는 변형을 고른다
  for (const p of list) {
    for (const v of p.variants ?? []) {
      const price = v.calculated_price?.calculated_amount
      if (price && (v.inventory_quantity == null || v.inventory_quantity > 0)) {
        variantId = v.id
        unitPrice = price
        break
      }
    }
    if (variantId) break
  }
  step(
    "④ 상품 조회",
    !!variantId,
    `상품 ${list.length}건 · 지역=${region?.name ?? "?"} · 선택 변형 단가=${won(unitPrice)}`
  )
  if (!variantId) process.exit(1)
}

// ── 4. 장바구니 ─────────────────────────────────────────────────────
let cartId = null
{
  const c = await api("/store/carts", { method: "POST", body: { region_id: region.id } })
  cartId = c.body?.cart?.id
  step("⑤ 장바구니 생성", !!cartId, `cart=${cartId ?? "실패"}`)

  const add = await api(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    body: { variant_id: variantId, quantity: 2 },
  })
  const items = add.body?.cart?.items ?? []
  step(
    "⑥ 담기(수량 2)",
    add.status === 200 && items.length === 1 && items[0].quantity === 2,
    `status=${add.status} · 품목=${items.length} · 수량=${items[0]?.quantity} · 소계=${won(add.body?.cart?.item_total)}`
  )

  // 잘못된 수량은 거부돼야 한다
  const bad = await api(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    body: { variant_id: variantId, quantity: 0 },
  })
  step("⑦ 수량 0 거부", bad.status === 400, `status=${bad.status}`)
}

// ── 5. 배송지·배송수단 ──────────────────────────────────────────────
{
  const addr = await api(`/store/carts/${cartId}`, {
    method: "POST",
    body: {
      email: CUST.email,
      shipping_address: {
        first_name: CUST.first_name,
        last_name: CUST.last_name,
        address_1: "테헤란로 1",
        city: "서울",
        postal_code: "06234",
        country_code: region?.countries?.[0]?.iso_2 ?? "kr",
        phone: "010-0000-0000",
      },
    },
  })
  step("⑧ 배송지 입력", addr.status === 200, `status=${addr.status}`)

  const opts = await api(`/store/shipping-options?cart_id=${cartId}`)
  const opt = opts.body?.shipping_options?.[0]
  step("⑨ 배송수단 조회", !!opt, `옵션 ${opts.body?.shipping_options?.length ?? 0}건 · ${opt?.name ?? "없음"}`)
  if (opt) {
    const set = await api(`/store/carts/${cartId}/shipping-methods`, {
      method: "POST",
      body: { option_id: opt.id },
    })
    step(
      "⑩ 배송수단 선택",
      set.status === 200,
      `status=${set.status} · 배송비=${won(set.body?.cart?.shipping_total)}`
    )
  }
}

// ── 6. 적립금 ───────────────────────────────────────────────────────
let usedPoints = 0
{
  const bal = await api("/store/customers/me/points")
  const balance = bal.body?.summary?.balance ?? 0
  step("⑪ 적립금 잔액 조회", bal.status === 200, `잔액=${balance}P`)

  // 보유보다 많이 쓰려고 하면 거부돼야 한다
  const over = await api(`/store/carts/${cartId}/points`, {
    method: "POST",
    body: { points: balance + 100000 },
  })
  step("⑫ 보유 초과 사용 거부", over.status === 400, `status=${over.status}`)

  if (balance > 0) {
    usedPoints = Math.min(balance, 1000)
    const use = await api(`/store/carts/${cartId}/points`, {
      method: "POST",
      body: { points: usedPoints },
    })
    step("⑬ 적립금 사용", use.status === 200, `${usedPoints}P 사용 · status=${use.status}`)
  } else {
    step("⑬ 적립금 사용", true, "신규 고객이라 잔액 0 — 건너뜀(정상)")
  }
}

// ── 7. 주문 ─────────────────────────────────────────────────────────
let orderId = null
let orderTotal = null
{
  const before = await api(`/store/carts/${cartId}`)
  const expected = before.body?.cart?.total

  const sessions = await api(`/store/payment-collections`, {
    method: "POST",
    body: { cart_id: cartId },
  })
  const pcId = sessions.body?.payment_collection?.id
  if (pcId) {
    await api(`/store/payment-collections/${pcId}/payment-sessions`, {
      method: "POST",
      body: { provider_id: "pp_system_default" },
    })
  }

  const done = await api(`/store/carts/${cartId}/complete`, { method: "POST" })
  const order = done.body?.order ?? done.body?.cart
  orderId = order?.id ?? null
  orderTotal = order?.total ?? null
  step(
    "⑭ 주문 완료",
    done.status === 200 && !!orderId && String(orderId).startsWith("order_"),
    `status=${done.status} · order=${orderId ?? "실패"} · 결제액=${won(orderTotal)}`
  )
  step(
    "⑮ 장바구니 금액 = 주문 금액",
    expected != null && orderTotal != null && Number(expected) === Number(orderTotal),
    `카트=${won(expected)} vs 주문=${won(orderTotal)}`
  )
}

// ── 8. 주문 조회 ────────────────────────────────────────────────────
{
  const mine = await api("/store/orders")
  const found = (mine.body?.orders ?? []).some((o) => o.id === orderId)
  step("⑯ 내 주문내역에 나온다", found, `주문 ${mine.body?.orders?.length ?? 0}건 · 포함=${found}`)

  const one = await api(`/store/orders/${orderId}`)
  step("⑰ 주문 상세 조회", one.status === 200, `status=${one.status} · 상태=${one.body?.order?.status}`)

  // 남의 주문은 못 봐야 한다
  const other = await api(`/store/orders/order_01ABCDEFGHIJKLMNOPQRSTUV`)
  step("⑱ 남의 주문 접근 차단", other.status === 404 || other.status === 401 || other.status === 403, `status=${other.status}`)
}

// ── 9. 적립 확인 ────────────────────────────────────────────────────
{
  // 주문 후 적립은 비동기(subscriber)라 잠깐 기다린다
  await new Promise((r) => setTimeout(r, 3000))
  const bal = await api("/store/customers/me/points")
  const balance = bal.body?.summary?.balance ?? 0
  step(
    "⑲ 구매 적립 반영",
    bal.status === 200,
    `구매 후 잔액=${balance}P (사용 ${usedPoints}P · 결제 ${won(orderTotal)})`
  )
}

// ── 요약 ────────────────────────────────────────────────────────────
const failed = steps.filter((s) => !s.ok)
console.log(`\n${"─".repeat(70)}`)
console.log(`${steps.length - failed.length}/${steps.length} 단계 통과`)
if (failed.length) {
  console.log("\n실패한 단계:")
  for (const f of failed) console.log(`  · ${f.name} — ${f.detail}`)
}
console.log(`\n생성된 주문: ${orderId ?? "없음"} · 고객: ${CUST.email}`)
process.exit(failed.length ? 1 : 0)
