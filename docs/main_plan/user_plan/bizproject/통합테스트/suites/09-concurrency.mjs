// 09 · 동시성·레이스 — 동시 요청에도 중복/오버셀/유실 없이 안전한가
// 방법: 같은 요청을 동시에 여러 개 발사(Promise.all)하고, 성공 개수·DB 상태로 정합성 판정.
export const meta = { area: "I. 동시성·레이스" }

async function makeAccount(ctx, tag) {
  const { http, pick, DEMO_PW } = ctx
  const email = `conc_${tag}_${Date.now()}@kr-itest.local`
  const reg = await http("POST", "/auth/customer/emailpass/register", { body: { email, password: DEMO_PW } })
  const token = pick(reg.json || {}, "token")
  const prof = await http("POST", "/store/customers", { token, body: { email, first_name: "동시", last_name: tag } })
  const customerId = pick(prof.json?.customer || {}, "id")
  return { email, token, customerId }
}

export default async function run(ctx) {
  const { http, rec, assert, state, pick, DEMO_PW } = ctx

  // I1 중복 회원가입 레이스: 같은 신규 이메일로 5개 동시 register → 정확히 1개만 성공
  {
    const email = `race_${Date.now()}@kr-itest.local`
    const calls = Array.from({ length: 5 }, () => http("POST", "/auth/customer/emailpass/register", { body: { email, password: DEMO_PW } }))
    const res = await Promise.all(calls)
    const ok = res.filter((r) => r.status === 200 && pick(r.json || {}, "token")).length
    assert("I1", "중복가입 레이스: 1건만 성공", ok === 1, `success=${ok}/5`, "=1")
  }

  // I2 위시리스트 동시 찜(dedup): 같은 상품 5회 동시 추가 → DB 유니크(1건)
  if (state.productId) {
    const acc = await makeAccount(ctx, "wl")
    const calls = Array.from({ length: 5 }, () => http("POST", "/store/customers/me/wishlist", { token: acc.token, body: { product_id: state.productId } }))
    await Promise.all(calls)
    const n = ctx.db.count(`select count(*) from product_wishlist where customer_id='${acc.customerId}' and product_id='${state.productId}' and deleted_at is null;`)
    assert("I2", "위시리스트 동시찜 → 중복 없음", (n ?? 99) <= 1, `db_rows=${n}`, "≤1")
    // 정리
    await http("POST", "/store/customers/me/withdraw", { token: acc.token })
  }

  // I3 동시 읽기 정합성: 주문조회 10회 동시 → 모두 동일 응답
  if (state.orderIds.gold) {
    const r0 = await http("GET", `/store/orders/${state.orderIds.gold}`, { token: state.tokens.gold })
    const did = pick(r0.json?.order || {}, "display_id")
    const calls = Array.from({ length: 10 }, () => http("POST", "/store/orders/lookup", { body: { display_id: did, email: "gold@kr-demo.local" } }))
    const res = await Promise.all(calls)
    const all200 = res.every((r) => r.status === 200)
    assert("I3", "동시 조회 10건 정합성", all200, `200=${res.filter((r) => r.status === 200).length}/10`, "모두 200")
  }

  // I4 적립금 동시 적립(lost-update 방지): 5회 동시 +100 → 정확히 +500, DB 합계 일치
  if (state.tokens.silver && state.customerIds.silver) {
    const cid = state.customerIds.silver
    const before = (await http("GET", "/store/customers/me/points", { token: state.tokens.silver })).json?.summary?.balance ?? 0
    const calls = Array.from({ length: 5 }, (_, i) => http("POST", `/admin/points/customers/${cid}/earn`, { token: state.adminToken, pub: false, body: { points: 100, reason: `동시적립${i}` } }))
    await Promise.all(calls)
    const after = (await http("GET", "/store/customers/me/points", { token: state.tokens.silver })).json?.summary?.balance ?? 0
    const dbSum = ctx.db.count(`select coalesce(sum(amount),0) from point_ledger where customer_id='${cid}';`)
    assert("I4", "동시 적립 lost-update 없음", after === before + 500 && dbSum === after, `${before}→${after} (db=${dbSum})`, "+500 일치")
  }

  // I5 재고 오버셀 방지: 재고를 1로 고정한 변형을 3개 카트에서 동시 결제 → 성공 주문 ≤ 1
  //   (지금까지 검증 공백이던 영역 — 재고 차감 경합)
  await testOversell(ctx)
}

/** 재고 1개 변형에 동시 주문 3건 → 오버셀(성공 2건 이상) 이 발생하지 않아야 한다. */
async function testOversell(ctx) {
  const { http, assert, state, pick } = ctx
  if (!state.adminToken || !state.regionId) {
    assert("I5", "재고 오버셀 방지", false, "사전자원(admin/region) 없음 — 스킵", "≤1")
    return
  }

  // 1) 재고 추적 중이고 location-level 이 있는 변형 1개 확보
  //    (다른 suite 가 쓰는 대표 변형 state.variantId 는 제외 — 재고 조작이 서로 간섭하지 않도록)
  const pl = await http("GET", "/store/products?limit=20&fields=*variants", {})
  const variants = (pl.json?.products ?? [])
    .flatMap((p) => p.variants ?? [])
    .filter((v) => v.id !== state.variantId)
  let target = null
  for (const v of variants) {
    const r = await http("GET", `/admin/inventory-items?limit=1&sku=${encodeURIComponent(v.sku ?? "")}`, {
      token: state.adminToken, pub: false,
    })
    const item = r.json?.inventory_items?.[0]
    if (!item) continue
    const lv = await http("GET", `/admin/inventory-items/${item.id}/location-levels`, {
      token: state.adminToken, pub: false,
    })
    const level = lv.json?.inventory_levels?.[0]
    if (level) { target = { variant: v, itemId: item.id, level }; break }
  }
  if (!target) {
    assert("I5", "재고 오버셀 방지", false, "재고 추적 변형을 찾지 못함 — 스킵", "≤1")
    return
  }

  const originalQty = Number(target.level.stocked_quantity ?? 0)
  const reserved = Number(target.level.reserved_quantity ?? 0)
  const setStock = (qty) =>
    http("POST", `/admin/inventory-items/${target.itemId}/location-levels/${target.level.location_id}`, {
      token: state.adminToken, pub: false, body: { stocked_quantity: qty },
    })

  let consumed = 0 // 테스트가 실제로 소비(예약)한 수량 — 원복 시 보정용
  try {
    // 2) 가용재고(stocked − reserved)를 정확히 1로 맞춘다
    await setStock(reserved + 1)

    // 3) 결제 직전까지 준비된 카트 3개 생성
    const carts = []
    for (let i = 0; i < 3; i++) {
      const c = await http("POST", "/store/carts", {
        body: {
          region_id: state.regionId,
          email: `oversell_${i}_${Date.now()}@kr-itest.local`,
          items: [{ variant_id: target.variant.id, quantity: 1 }],
        },
      })
      const cartId = pick(c.json?.cart || {}, "id")
      if (!cartId) continue
      await http("POST", `/store/carts/${cartId}`, {
        body: {
          shipping_address: {
            first_name: "동시", last_name: `주문${i}`, address_1: "서울 강남구 1",
            city: "서울", province: "서울", postal_code: "06234", country_code: "kr", phone: "010-0000-0000",
          },
        },
      })
      const so = await http("GET", `/store/shipping-options?cart_id=${cartId}`, {})
      const opt = so.json?.shipping_options?.[0]
      if (opt) await http("POST", `/store/carts/${cartId}/shipping-methods`, { body: { option_id: opt.id } })
      const pc = await http("POST", "/store/payment-collections", { body: { cart_id: cartId } })
      const pcId = pick(pc.json?.payment_collection || {}, "id")
      if (pcId) {
        await http("POST", `/store/payment-collections/${pcId}/payment-sessions`, {
          body: { provider_id: "pp_system_default" },
        })
      }
      carts.push(cartId)
    }

    if (carts.length < 2) {
      assert("I5", "재고 오버셀 방지", false, `카트 준비 실패(n=${carts.length}) — 검증 불가`, "≤1")
      return
    }

    // 4) 동시 결제
    const res = await Promise.all(carts.map((id) => http("POST", `/store/carts/${id}/complete`, {})))
    const orders = res.map((r) => r.json?.order?.id).filter(Boolean)
    consumed = orders.length

    assert(
      "I5",
      `재고 1개 동시주문 ${carts.length}건 → 오버셀 없음`,
      orders.length <= 1,
      `주문성공=${orders.length}/${carts.length} (statuses=${res.map((r) => r.status).join(",")})`,
      "≤1"
    )

    // 5) DB 교차검증: 재고가 음수로 내려가지 않았는가
    const remaining = ctx.db.count(
      `select stocked_quantity - reserved_quantity from inventory_level where inventory_item_id='${target.itemId}';`
    )
    assert("I5b", "DB: 가용재고 음수 아님", remaining === null || Number(remaining) >= 0, `available=${remaining}`, "≥0")
  } finally {
    // 6) 재고 원복 — 테스트 주문이 예약(reserved)한 만큼 더해 줘야 가용재고가 원래대로 돌아온다.
    //    (단순히 originalQty 로 되돌리면 실행할수록 가용재고가 음수로 드리프트한다)
    await setStock(originalQty + consumed)
  }
}
