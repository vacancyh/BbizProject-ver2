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
}
