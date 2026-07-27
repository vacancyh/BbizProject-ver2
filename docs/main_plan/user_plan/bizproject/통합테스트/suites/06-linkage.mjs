// 06 · 연계 시나리오 — 리뷰검수·주문노출·쿠폰·적립금·문의답변·비회원조회 (계층 간 연동)
export const meta = { area: "F. 연계 시나리오" }

export default async function run(ctx) {
  const { http, rec, assert, state, pick } = ctx
  const at = state.adminToken

  // F1 리뷰 pending → admin 큐 → 승인 → 스토어 노출
  if (state.productId && state.tokens.silver) {
    const marker = `연계테스트-${Date.now()}`
    let r = await http("POST", `/store/products/${state.productId}/reviews`, { token: state.tokens.silver, body: { author_name: "실버", author_email: "silver@kr-demo.local", rating: 5, title: marker, content: `${marker} 본문입니다.` } })
    rec("F1a", "리뷰 작성(pending)", "POST", "/store/products/:id/reviews", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)

    r = await http("GET", "/admin/reviews?type=review&status=pending&limit=100", { token: at, pub: false })
    const list = r.json?.reviews ?? r.json?.items ?? []
    const mine = list.find((x) => (x.title || "").includes(marker))
    rec("F1b", "관리자 큐 노출", "GET", "/admin/reviews", "pending 노출", r, !!mine, mine?.id || "미발견")

    if (mine?.id) {
      r = await http("POST", `/admin/reviews/${mine.id}`, { token: at, pub: false, body: { status: "published" } })
      rec("F1c", "관리자 리뷰 승인", "POST", "/admin/reviews/:id", "200", r, r.status === 200, `status=${r.status}`)
      r = await http("GET", `/store/products/${state.productId}/reviews`, {})
      const shown = (r.json?.reviews ?? []).find((x) => (x.title || "").includes(marker))
      rec("F1d", "승인 리뷰 스토어 노출", "GET", "/store/products/:id/reviews", "published 노출", r, !!shown, shown ? "노출" : "미노출")
    }
  }

  // F2 고객 주문 → 관리자 주문검색
  {
    const r = await http("GET", `/admin/orders-kr/search?q=${encodeURIComponent("gold@kr-demo.local")}&limit=20`, { token: at, pub: false })
    const n = (r.json?.orders ?? r.json?.items ?? []).length
    rec("F2", "주문→관리자검색 노출", "GET", "/admin/orders-kr/search", "≥1", r, r.status === 200 && n >= 1, `n=${n}`)
  }

  // F3 쿠폰 admin→store
  {
    const r = await http("GET", "/store/coupons", {})
    const codes = JSON.stringify((Array.isArray(r.json) ? r.json : (r.json?.coupons ?? [])).map((c) => c.code || c))
    rec("F3", "쿠폰 admin→store 노출", "GET", "/store/coupons", "WELCOME10", r, r.status === 200 && codes.includes("WELCOME10"), codes.slice(0, 60))
  }

  // F4 관리자 적립 → 고객 잔액 (+DB 교차검증)
  if (state.tokens.test && state.customerIds.test) {
    const cid = state.customerIds.test
    let r = await http("GET", "/store/customers/me/points", { token: state.tokens.test })
    const before = r.json?.summary?.balance ?? 0
    r = await http("POST", `/admin/points/customers/${cid}/earn`, { token: at, pub: false, body: { points: 500, reason: "통합테스트 적립" } })
    const earned = r.status === 200 || r.status === 201
    const r2 = await http("GET", "/store/customers/me/points", { token: state.tokens.test })
    const after = r2.json?.summary?.balance ?? 0
    rec("F4", "관리자 적립→고객 잔액", "POST", "/admin/points/customers/:id/earn", `+500`, r, earned && after === before + 500, `${before}→${after}`)
    const dbSum = ctx.db.count(`select coalesce(sum(amount),0) from point_ledger where customer_id='${cid}';`)
    assert("F4b", "DB: 원장 합계=잔액", (dbSum ?? -1) === after, `db_sum=${dbSum} api=${after}`, "일치")
  }

  // F5 문의 작성 → 관리자 답변
  if (state.productId && state.tokens.vip) {
    const marker = `연계문의-${Date.now()}`
    let r = await http("POST", `/store/products/${state.productId}/inquiries`, { token: state.tokens.vip, body: { author_name: "VIP", author_email: "vip@kr-demo.local", content: `${marker} 재입고 문의드립니다.` } })
    rec("F5a", "상품 문의 작성", "POST", "/store/products/:id/inquiries", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)
    r = await http("GET", "/admin/reviews?type=inquiry&limit=100", { token: at, pub: false })
    const q = (r.json?.reviews ?? r.json?.items ?? []).find((x) => (x.content || "").includes(marker))
    if (q?.id) {
      r = await http("POST", `/admin/reviews/${q.id}`, { token: at, pub: false, body: { reply: "다음 주 재입고 예정입니다.", status: "published" } })
      rec("F5b", "관리자 문의 답변", "POST", "/admin/reviews/:id", "200", r, r.status === 200, `status=${r.status}`)
    } else rec("F5b", "관리자 문의 답변", "POST", "/admin/reviews/:id", "문의발견", { status: 0 }, false, "미발견")
  }

  // F6 비회원 주문조회 (정상/불일치)
  if (state.orderIds.gold) {
    const r0 = await http("GET", `/store/orders/${state.orderIds.gold}`, { token: state.tokens.gold })
    const did = pick(r0.json?.order || {}, "display_id")
    const r = await http("POST", "/store/orders/lookup", { body: { display_id: did, email: "gold@kr-demo.local" } })
    rec("F6a", "비회원 주문조회(정상)", "POST", "/store/orders/lookup", "200", r, r.status === 200, `display_id=${did}`)
    const rb = await http("POST", "/store/orders/lookup", { body: { display_id: did, email: "wrong@x.com" } })
    rec("F6b", "비회원 주문조회(불일치)", "POST", "/store/orders/lookup", "404", rb, rb.status === 404, `status=${rb.status}`)
  }
}
