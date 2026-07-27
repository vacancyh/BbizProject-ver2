// 08 · 부정·경계 케이스 — 잘못된 입력·경계값·인증실패가 안전하게 거부되는지
// pass 기준: "성공하면 안 되는 요청"은 4xx로 거부(또는 지정 코드). 잘못된 입력이 200으로 통과하면 FAIL(검증 누락 발견).
export const meta = { area: "H. 부정·경계" }

export default async function run(ctx) {
  const { http, rec, state, DEMO_PW } = ctx
  const P = state.productId

  // H1 빈 비밀번호 회원가입 → 거부
  let r = await http("POST", "/auth/customer/emailpass/register", { body: { email: `neg_${Date.now()}@x.local`, password: "" } })
  rec("H1", "빈 비밀번호 가입 거부", "POST", "/auth/customer/emailpass/register", "4xx", r, r.status >= 400 && r.status < 500, `status=${r.status}`)

  // H2 잘못된 이메일 형식 로그인 → 401/4xx
  r = await http("POST", "/auth/customer/emailpass", { body: { email: "not-an-email", password: DEMO_PW } })
  rec("H2", "잘못된 이메일 로그인 거부", "POST", "/auth/customer/emailpass", "4xx", r, r.status >= 400 && r.status < 500, `status=${r.status}`)

  // H3 존재하지 않는 사용자 로그인 → 401
  r = await http("POST", "/auth/customer/emailpass", { body: { email: `nobody_${Date.now()}@x.local`, password: DEMO_PW } })
  rec("H3", "미존재 사용자 로그인 거부", "POST", "/auth/customer/emailpass", "401", r, r.status === 401, `status=${r.status}`)

  // H4 리뷰 별점 경계 초과(9) → 거부(4xx) 또는 1~5로 정제. 핵심: 잘못된 별점이 DB에 남지 않을 것(무결성).
  if (P) {
    r = await http("POST", `/store/products/${P}/reviews`, { token: state.tokens.test, body: { author_email: "test@kr-demo.local", rating: 9, content: "경계값 테스트 리뷰 본문" } })
    const outOfRange = ctx.db.count(`select count(*) from review where rating > 5 or rating < 1;`)
    const ok = (r.status >= 400 && r.status < 500) || outOfRange === 0
    rec("H4", "리뷰 별점 범위초과 안전처리", "POST", "/store/products/:id/reviews", "4xx 또는 1~5 정제", r, ok, `status=${r.status}, 범위밖행=${outOfRange}`)
    // H5 리뷰 본문 누락 → 거부
    r = await http("POST", `/store/products/${P}/reviews`, { token: state.tokens.test, body: { author_email: "test@kr-demo.local", rating: 4 } })
    rec("H5", "리뷰 본문 누락 거부", "POST", "/store/products/:id/reviews", "4xx", r, r.status >= 400 && r.status < 500, `status=${r.status}`)
    // H6 문의 본문 너무 짧음(<5) → 거부
    r = await http("POST", `/store/products/${P}/inquiries`, { token: state.tokens.test, body: { author_email: "test@kr-demo.local", content: "짧음" } })
    rec("H6", "문의 본문 최소길이 검증", "POST", "/store/products/:id/inquiries", "4xx", r, r.status >= 400 && r.status < 500, `status=${r.status}`)
  }

  // H7 비회원 주문조회 미존재 display_id → 404
  r = await http("POST", "/store/orders/lookup", { body: { display_id: 999999, email: "x@x.com" } })
  rec("H7", "주문조회 미존재 → 404", "POST", "/store/orders/lookup", "404", r, r.status === 404, `status=${r.status}`)

  // H8 위조 토큰으로 보호 라우트 → 401
  r = await http("GET", "/store/customers/me", { headers: { authorization: "Bearer forged.token.value" } })
  rec("H8", "위조 토큰 거부", "GET", "/store/customers/me", "401", r, r.status === 401, `status=${r.status}`)

  // H9 재입고 알림 필수값 누락 → 거부
  r = await http("POST", "/store/restock-notifications", { body: { email: "x@x.com" } })
  rec("H9", "재입고알림 필수값 검증", "POST", "/store/restock-notifications", "4xx", r, r.status >= 400 && r.status < 500, `status=${r.status}`)

  // H10 페이지네이션 과대 offset → 200 빈 배열(안전)
  r = await http("GET", "/store/products?limit=5&offset=100000", {})
  rec("H10", "과대 offset 안전 처리", "GET", "/store/products", "200+빈", r, r.status === 200 && (r.json?.products?.length ?? 0) === 0, `n=${r.json?.products?.length ?? 0}`)

  // H11 잘못된 variant 로 카트 생성 → 거부(2xx 아님)
  r = await http("POST", "/store/carts", { body: { region_id: state.regionId, items: [{ variant_id: "variant_does_not_exist", quantity: 1 }] } })
  rec("H11", "잘못된 variant 카트 거부", "POST", "/store/carts", "非2xx", r, r.status >= 400, `status=${r.status}`)

  // H12 관리자 프로모션 미인증 생성 시도 → 401
  r = await http("POST", "/admin/banners", { pub: false, body: { kind: "hero", title: "x", image_url: "x" } })
  rec("H12", "미인증 admin 쓰기 거부", "POST", "/admin/banners", "401", r, r.status === 401, `status=${r.status}`)
}
