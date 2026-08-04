// 07 · 검색조건 (영역별 분리) — 상품/주문/회원/리뷰, 각 필터·정렬·페이지네이션
export const meta = { area: "G. 검색조건" }

export default async function run(ctx) {
  const { http, rec, state } = ctx
  const at = state.adminToken

  // G1 상품검색
  const g1 = [
    ["G1a", "전체", "/store/products?limit=5"],
    ["G1b", "키워드(q)", "/store/products?q=티셔츠&limit=5"],
    ["G1c", "키워드 무매칭", "/store/products?q=존재하지않는상품xyz&limit=5"],
    ["G1d", "페이지네이션(offset)", "/store/products?limit=2&offset=2"],
    ["G1e", "정렬(created_at)", "/store/products?order=created_at&limit=3"],
    ["G1f", "정렬(-created_at)", "/store/products?order=-created_at&limit=3"],
    ["G1g", "핸들 필터", "/store/products?handle=t-shirt"],
  ]
  for (const [id, name, path] of g1) {
    const r = await http("GET", path, {})
    rec(id, `상품검색·${name}`, "GET", path.split("?")[0], "200", r, r.status === 200, `n=${r.json?.products?.length ?? 0}`)
  }
  const rc = await http("GET", "/store/product-categories?limit=1", {})
  const catId = rc.json?.product_categories?.[0]?.id
  if (catId) {
    const r = await http("GET", `/store/products?category_id[]=${catId}&limit=5`, {})
    rec("G1h", "상품검색·카테고리", "GET", "/store/products?category_id[]", "200", r, r.status === 200, `n=${r.json?.products?.length ?? 0}`)
  }

  // G2 주문검색(admin)
  const g2 = [
    ["G2a", "전체", "/admin/orders-kr/search?limit=5"],
    ["G2b", "키워드(email)", `/admin/orders-kr/search?q=${encodeURIComponent("gold@kr-demo.local")}&limit=5`],
    ["G2c", "결제상태(captured)", "/admin/orders-kr/search?payment_status=captured&limit=5"],
    ["G2d", "결제상태(authorized)", "/admin/orders-kr/search?payment_status=authorized&limit=5"],
    ["G2e", "배송상태(not_fulfilled)", "/admin/orders-kr/search?fulfillment_status=not_fulfilled&limit=5"],
    ["G2f", "페이지네이션", "/admin/orders-kr/search?limit=2&offset=2"],
  ]
  for (const [id, name, path] of g2) {
    const r = await http("GET", path, { token: at, pub: false })
    const n = (r.json?.orders ?? r.json?.items ?? []).length
    rec(id, `주문검색·${name}`, "GET", "/admin/orders-kr/search", "200", r, r.status === 200, `n=${n}`)
  }

  // G3 회원검색(admin)
  const g3 = [
    ["G3a", "전체", "/admin/customers?limit=5"],
    ["G3b", "이메일 부분일치", "/admin/customers?q=kr-demo&limit=10"],
    ["G3c", "한글 이름", `/admin/customers?q=${encodeURIComponent("김")}&limit=10`],
    ["G3d", "무매칭", "/admin/customers?q=zzzznotexist&limit=5"],
    ["G3e", "페이지네이션", "/admin/customers?limit=3&offset=3"],
  ]
  for (const [id, name, path] of g3) {
    const r = await http("GET", path, { token: at, pub: false })
    const n = (r.json?.customers ?? r.json?.items ?? []).length
    rec(id, `회원검색·${name}`, "GET", "/admin/customers", "200", r, r.status === 200, `n=${n}`)
  }

  // G4 리뷰·문의 검색(admin)
  const g4 = [
    ["G4a", "리뷰 전체", "/admin/reviews?type=review&limit=10"],
    ["G4b", "리뷰 pending", "/admin/reviews?type=review&status=pending&limit=10"],
    ["G4c", "리뷰 published", "/admin/reviews?type=review&status=published&limit=10"],
    ["G4d", "문의(inquiry)", "/admin/reviews?type=inquiry&limit=10"],
  ]
  for (const [id, name, path] of g4) {
    const r = await http("GET", path, { token: at, pub: false })
    const n = (r.json?.reviews ?? r.json?.items ?? []).length
    rec(id, `리뷰검색·${name}`, "GET", "/admin/reviews", "200", r, r.status === 200, `n=${n}`)
  }
}
