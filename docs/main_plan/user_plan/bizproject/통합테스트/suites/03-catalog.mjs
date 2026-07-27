// 03 · 스토어 카탈로그·콘텐츠 — 상품/리뷰/문의/고시/쿠폰/타임세일/CMS/약관/조회수
export const meta = { area: "C. 카탈로그·콘텐츠" }

export default async function run(ctx) {
  const { http, rec, assert, state, pick } = ctx

  let r = await http("GET", "/store/products?limit=5", {})
  const prods = r.json?.products ?? []
  rec("C1", "상품 목록", "GET", "/store/products", "200+상품", r, r.status === 200 && prods.length > 0, `n=${prods.length}`)

  if (state.productId) {
    r = await http("GET", `/store/products/${state.productId}`, {})
    rec("C2", "상품 상세", "GET", "/store/products/:id", "200", r, r.status === 200 && !!r.json?.product, pick(r.json?.product || {}, "title"))
    r = await http("GET", `/store/products/${state.productId}/reviews`, {})
    rec("C3", "상품 리뷰 목록", "GET", "/store/products/:id/reviews", "200", r, r.status === 200, `n=${r.json?.reviews?.length ?? 0}`)
    r = await http("GET", `/store/products/${state.productId}/inquiries`, {})
    rec("C4", "상품 문의 목록", "GET", "/store/products/:id/inquiries", "200", r, r.status === 200, `status=${r.status}`)
    r = await http("GET", `/store/products/${state.productId}/disclosure`, {})
    rec("C5", "상품정보고시", "GET", "/store/products/:id/disclosure", "200/404", r, r.status === 200 || r.status === 404, `status=${r.status}`)
    // 조회수 기록 + DB 교차검증 (product_view_count)
    r = await http("POST", `/store/products/${state.productId}/view`, {})
    rec("C6", "상품 조회수 기록", "POST", "/store/products/:id/view", "202", r, r.status === 202 || r.status === 200, `status=${r.status}`)
    const vc = ctx.db.count(`select coalesce(sum(count),0) from product_view_count where product_id='${state.productId}';`)
    assert("C6b", "DB: 조회수 누적 기록", (vc ?? 0) >= 1, `count=${vc}`, "≥1")
  }

  for (const [id, path, name, key] of [
    ["C7", "/store/coupons", "쿠폰", "coupons"],
    ["C8", "/store/time-sales", "타임세일", "time_sales"],
    ["C9", "/store/banners?kind=hero", "배너(hero)", "banners"],
    ["C10", "/store/notices", "공지", "notices"],
    ["C11", "/store/faqs", "FAQ", "faqs"],
    ["C12", "/store/curated-products", "홈 큐레이션", "product_ids"],
    ["C13", "/store/best-products", "베스트 상품", "products"],
    ["C14", "/store/popular-search-terms", "인기 검색어", "terms"],
  ]) {
    const rr = await http("GET", path, {})
    const arr = rr.json && (Array.isArray(rr.json) ? rr.json : (rr.json[key] ?? Object.values(rr.json).find(Array.isArray)))
    rec(id, name, "GET", path.split("?")[0], "200", rr, rr.status === 200, `n=${Array.isArray(arr) ? arr.length : "?"}`)
  }

  for (const [id, slug] of [["C15", "terms-of-use"], ["C16", "privacy-policy"]]) {
    const rr = await http("GET", `/store/legal-docs/${slug}`, {})
    rec(id, `약관(${slug})`, "GET", "/store/legal-docs/:slug", "200+body", rr, rr.status === 200 && !!(rr.json?.body ?? rr.json?.doc), `status=${rr.status}`)
  }
}
