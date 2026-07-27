// 02 · 사용자 기능 — 내정보/배송지/적립금/멤버십/동의/주문/위시리스트 (+DB 교차검증)
export const meta = { area: "B. 사용자 기능" }

export default async function run(ctx) {
  const { http, rec, assert, state, pick } = ctx
  const gt = state.tokens.gold

  let r = await http("GET", "/store/customers/me", { token: gt })
  rec("B1", "내 정보 조회", "GET", "/store/customers/me", "200", r, r.status === 200 && !!r.json?.customer, pick(r.json?.customer || {}, "email"))

  r = await http("GET", "/store/customers/me/addresses", { token: gt })
  const addrN = r.json?.addresses?.length ?? r.json?.count ?? 0
  rec("B2", "배송지 목록", "GET", "/store/customers/me/addresses", "200+≥1", r, r.status === 200 && addrN >= 1, `n=${addrN}`)

  r = await http("POST", "/store/customers/me/addresses", { token: gt, body: { first_name: "골드", last_name: "김", address_1: "서울 강남구 추가로 2", city: "서울", province: "서울", postal_code: "06000", country_code: "kr", phone: "010-9999-0002" } })
  rec("B3", "배송지 추가", "POST", "/store/customers/me/addresses", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)

  // 적립금 (응답: summary.balance)
  r = await http("GET", "/store/customers/me/points", { token: gt })
  const bal = r.json?.summary?.balance
  rec("B4", "적립금 조회", "GET", "/store/customers/me/points", "200+balance>0", r, r.status === 200 && (bal ?? 0) > 0, `balance=${bal}`)

  r = await http("GET", "/store/customers/me/membership", { token: gt })
  const tier = pick(r.json || {}, "current_tier", "tier") ?? r.json?.membership?.current_tier
  rec("B5", "멤버십 등급", "GET", "/store/customers/me/membership", "200+골드", r, r.status === 200 && String(tier || "").includes("골드"), `tier=${tier}`)

  r = await http("GET", "/store/customers/me/consents", { token: gt })
  rec("B6a", "동의 조회", "GET", "/store/customers/me/consents", "200", r, r.status === 200, JSON.stringify(pick(r.json || {}, "consents") ?? "").slice(0, 50))
  r = await http("POST", "/store/customers/me/consents", { token: gt, body: { channel: "marketing", agreed: false } })
  rec("B6b", "동의 변경", "POST", "/store/customers/me/consents", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)

  r = await http("GET", "/store/orders", { token: gt })
  const ords = r.json?.orders ?? []
  if (ords[0]) state.orderIds.gold = ords[0].id
  rec("B7", "주문 목록", "GET", "/store/orders", "200+≥1", r, r.status === 200 && ords.length >= 1, `n=${ords.length}`)
  if (state.orderIds.gold) {
    r = await http("GET", `/store/orders/${state.orderIds.gold}`, { token: gt })
    rec("B8", "주문 상세", "GET", "/store/orders/:id", "200", r, r.status === 200 && !!r.json?.order, pick(r.json?.order || {}, "display_id"))
  }

  // 위시리스트 (테이블 생성돼 있어야 정상)
  const t = state.fresh.token || gt
  if (state.productId) {
    r = await http("POST", "/store/customers/me/wishlist", { token: t, body: { product_id: state.productId } })
    rec("B9a", "위시리스트 추가", "POST", "/store/customers/me/wishlist", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)
    r = await http("GET", "/store/customers/me/wishlist", { token: t })
    rec("B9b", "위시리스트 조회", "GET", "/store/customers/me/wishlist", "200", r, r.status === 200, `status=${r.status}`)
    // DB 교차검증: 실제 행 존재
    const cid = state.fresh.customerId
    if (cid) {
      const n = ctx.db.count(`select count(*) from product_wishlist where customer_id='${cid}' and product_id='${state.productId}' and deleted_at is null;`)
      assert("B9c", "DB: 위시리스트 행 존재", (n ?? 0) >= 1, `rows=${n}`, "≥1")
    }
    r = await http("DELETE", `/store/customers/me/wishlist/${state.productId}`, { token: t })
    rec("B9d", "위시리스트 삭제", "DELETE", "/store/customers/me/wishlist/:productId", "200", r, r.status === 200 || r.status === 204, `status=${r.status}`)
  }
}
