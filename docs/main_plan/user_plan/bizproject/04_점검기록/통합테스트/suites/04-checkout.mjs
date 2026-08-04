// 04 · 장바구니→주문→결제 전체 흐름 (+쿠폰/적립금 +DB 교차검증)
export const meta = { area: "D. 장바구니·주문·결제" }

export default async function run(ctx) {
  const { http, rec, assert, state, pick } = ctx
  const t = state.tokens.gold

  if (!state.regionId || !state.variantId) {
    rec("D0", "사전자원(리전/상품)", "-", "-", "확보", { status: 0 }, false, "리전/상품 없음")
    return
  }
  rec("D0", "리전(KRW) 확보", "GET", "/store/regions", "KRW", { status: 200 }, true, state.regionId)

  let r = await http("POST", "/store/carts", { token: t, body: { region_id: state.regionId, email: "gold@kr-demo.local", items: [{ variant_id: state.variantId, quantity: 1 }] } })
  const cartId = pick(r.json?.cart || {}, "id")
  rec("D1", "카트 생성", "POST", "/store/carts", "200+cart", r, r.status === 200 && !!cartId, cartId || "no cart")
  if (!cartId) return

  r = await http("POST", `/store/carts/${cartId}`, { token: t, body: { shipping_address: { first_name: "골드", last_name: "김", address_1: "서울 강남구 1", city: "서울", province: "서울", postal_code: "06234", country_code: "kr", phone: "010-3000-0001" }, email: "gold@kr-demo.local" } })
  rec("D2", "카트 배송지", "POST", "/store/carts/:id", "200", r, r.status === 200, `status=${r.status}`)

  r = await http("GET", `/store/shipping-options?cart_id=${cartId}`, { token: t })
  const opt = r.json?.shipping_options?.[0]
  rec("D3a", "배송옵션 조회", "GET", "/store/shipping-options", "200+옵션", r, r.status === 200 && !!opt, `n=${r.json?.shipping_options?.length ?? 0}`)
  if (opt) {
    r = await http("POST", `/store/carts/${cartId}/shipping-methods`, { token: t, body: { option_id: opt.id } })
    rec("D3b", "배송방법 설정", "POST", "/store/carts/:id/shipping-methods", "200", r, r.status === 200, `status=${r.status}`)
  }

  r = await http("POST", `/store/carts/${cartId}/promotions`, { token: t, body: { promo_codes: ["WELCOME10"] } })
  const disc = pick(r.json?.cart || {}, "discount_total")
  rec("D4", "쿠폰(WELCOME10) 적용", "POST", "/store/carts/:id/promotions", "200+할인", r, r.status === 200 && (disc ?? 0) > 0, `discount=${disc}`)

  r = await http("POST", `/store/carts/${cartId}/points`, { token: t, body: { points: 1000 } })
  rec("D5", "적립금 적용", "POST", "/store/carts/:id/points", "200/400", r, r.status === 200 || r.status === 400, `status=${r.status}`)

  r = await http("POST", "/store/payment-collections", { token: t, body: { cart_id: cartId } })
  const pcId = pick(r.json?.payment_collection || {}, "id")
  rec("D6a", "결제 컬렉션", "POST", "/store/payment-collections", "200", r, r.status === 200 && !!pcId, pcId || "no pc")
  if (pcId) {
    r = await http("POST", `/store/payment-collections/${pcId}/payment-sessions`, { token: t, body: { provider_id: "pp_system_default" } })
    rec("D6b", "결제 세션", "POST", "/store/payment-collections/:id/payment-sessions", "200", r, r.status === 200, `status=${r.status}`)
  }
  r = await http("POST", `/store/carts/${cartId}/complete`, { token: t })
  const oid = pick(r.json?.order || {}, "id")
  if (oid) state.orderIds.checkout = oid
  rec("D7", "주문 완료(checkout)", "POST", "/store/carts/:id/complete", "200+order", r, r.status === 200 && !!oid, oid || `type=${r.json?.type}`)

  // DB 교차검증: 주문이 실제 DB 에 존재
  if (oid) {
    const n = ctx.db.count(`select count(*) from "order" where id='${oid}';`)
    assert("D7b", "DB: 주문 레코드 존재", (n ?? 0) === 1, `rows=${n}`, "=1")
  }
}
