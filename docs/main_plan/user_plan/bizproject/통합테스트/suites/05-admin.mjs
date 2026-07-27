// 05 · 관리자 기능 — 상품/주문/회원/리뷰/프로모션/배너/대시보드/휴면 + 접근차단
export const meta = { area: "E. 관리자 기능" }

export default async function run(ctx) {
  const { http, rec, state } = ctx
  const at = state.adminToken

  let r = await http("GET", "/admin/products?limit=5", { token: at, pub: false })
  rec("E1", "상품 목록", "GET", "/admin/products", "200", r, r.status === 200 && Array.isArray(r.json?.products), `n=${r.json?.products?.length ?? 0}`)

  r = await http("GET", "/admin/orders?limit=5", { token: at, pub: false })
  rec("E2", "주문 목록", "GET", "/admin/orders", "200", r, r.status === 200 && Array.isArray(r.json?.orders), `n=${r.json?.orders?.length ?? 0}`)

  r = await http("GET", "/admin/customers?limit=5", { token: at, pub: false })
  rec("E3", "회원 목록", "GET", "/admin/customers", "200", r, r.status === 200 && Array.isArray(r.json?.customers), `n=${r.json?.customers?.length ?? 0}`)

  r = await http("GET", "/admin/reviews?type=review&limit=10", { token: at, pub: false })
  rec("E4", "리뷰 목록", "GET", "/admin/reviews", "200", r, r.status === 200, `n=${(r.json?.reviews?.length ?? r.json?.items?.length ?? "?")}`)

  r = await http("GET", "/admin/promotions?limit=5", { token: at, pub: false })
  rec("E5", "프로모션 목록", "GET", "/admin/promotions", "200", r, r.status === 200, `n=${r.json?.promotions?.length ?? 0}`)

  r = await http("GET", "/admin/banners", { token: at, pub: false })
  rec("E6a", "배너 목록", "GET", "/admin/banners", "200", r, r.status === 200, `status=${r.status}`)
  r = await http("POST", "/admin/banners", { token: at, pub: false, body: { kind: "hero", title: "통합테스트 배너", image_url: "https://picsum.photos/seed/itest/1200/400", link_url: "/kr", sort_order: 99, status: "published" } })
  rec("E6b", "배너 생성", "POST", "/admin/banners", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)

  r = await http("GET", "/admin/dashboard/stats", { token: at, pub: false })
  rec("E7", "대시보드 통계", "GET", "/admin/dashboard/stats", "200", r, r.status === 200, `status=${r.status}`)

  r = await http("GET", "/admin/customers/dormancy?dormantDays=365&warnDays=30", { token: at, pub: false })
  rec("E8", "휴면회원 조회", "GET", "/admin/customers/dormancy", "200", r, r.status === 200, `status=${r.status}`)

  // 접근차단
  r = await http("GET", "/admin/products", { token: state.tokens.gold, pub: false })
  rec("E9", "권한차단(고객→admin)", "GET", "/admin/products", "401/403", r, r.status === 401 || r.status === 403, `status=${r.status}`)
  r = await http("GET", "/admin/orders", { pub: false })
  rec("E10", "미인증 admin 차단", "GET", "/admin/orders", "401", r, r.status === 401, `status=${r.status}`)
}
