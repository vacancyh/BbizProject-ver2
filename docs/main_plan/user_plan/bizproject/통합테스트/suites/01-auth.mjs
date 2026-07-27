// 01 · 인증·계정 — 로그인/회원가입/중복차단/데모계정/미인증 차단
export const meta = { area: "A. 인증·계정" }

export default async function run(ctx) {
  const { http, rec, state, pick, DEMO_PW } = ctx

  // A1 관리자 로그인
  let r = await http("POST", "/auth/user/emailpass", { pub: false, body: { email: ctx.ADMIN_EMAIL, password: ctx.ADMIN_PW } })
  const adminOk = r.status === 200 && !!pick(r.json || {}, "token")
  if (adminOk) state.adminToken = pick(r.json, "token")
  rec("A1", "관리자 로그인", "POST", "/auth/user/emailpass", "200+token", r, adminOk, adminOk ? "token" : "no token")

  // A2 관리자 로그인 실패
  r = await http("POST", "/auth/user/emailpass", { pub: false, body: { email: ctx.ADMIN_EMAIL, password: "wrong!" } })
  rec("A2", "관리자 로그인 실패(오비번)", "POST", "/auth/user/emailpass", "401", r, r.status === 401, `status=${r.status}`)

  // A3 고객 회원가입
  const email = `itest_${Date.now()}@kr-itest.local`
  state.fresh.email = email
  r = await http("POST", "/auth/customer/emailpass/register", { body: { email, password: DEMO_PW } })
  const regToken = pick(r.json || {}, "token")
  rec("A3", "고객 회원가입(register)", "POST", "/auth/customer/emailpass/register", "200+token", r, r.status === 200 && !!regToken, email)

  // A4 고객 프로필 생성
  r = await http("POST", "/store/customers", { token: regToken, body: { email, first_name: "통합", last_name: "테스트" } })
  state.fresh.customerId = pick(r.json?.customer || {}, "id")
  rec("A4", "고객 프로필 생성", "POST", "/store/customers", "200/201", r, (r.status === 200 || r.status === 201) && !!state.fresh.customerId, state.fresh.customerId || "no id")

  // A5 중복 회원가입 차단
  r = await http("POST", "/auth/customer/emailpass/register", { body: { email, password: DEMO_PW } })
  rec("A5", "중복 회원가입 차단", "POST", "/auth/customer/emailpass/register", "4xx", r, r.status >= 400 && r.status < 500, `status=${r.status}`)

  // A6 신규 로그인
  r = await http("POST", "/auth/customer/emailpass", { body: { email, password: DEMO_PW } })
  state.fresh.token = pick(r.json || {}, "token")
  rec("A6", "신규 고객 로그인", "POST", "/auth/customer/emailpass", "200+token", r, r.status === 200 && !!state.fresh.token, state.fresh.token ? "token" : "no token")

  // A7 고객 로그인 실패
  r = await http("POST", "/auth/customer/emailpass", { body: { email, password: "nope" } })
  rec("A7", "고객 로그인 실패(오비번)", "POST", "/auth/customer/emailpass", "401", r, r.status === 401, `status=${r.status}`)

  // A8 데모 4종 로그인
  for (const k of ["test", "silver", "gold", "vip"]) {
    r = await http("POST", "/auth/customer/emailpass", { body: { email: `${k}@kr-demo.local`, password: DEMO_PW } })
    if (r.status === 200) state.tokens[k] = pick(r.json, "token")
    rec(`A8_${k}`, `데모 로그인(${k})`, "POST", "/auth/customer/emailpass", "200+token", r, r.status === 200 && !!state.tokens[k], `${k}@kr-demo.local`)
  }

  // A9 미인증 보호라우트 차단
  r = await http("GET", "/store/customers/me/points", { pub: true })
  rec("A9", "미인증 보호라우트 차단", "GET", "/store/customers/me/points", "401", r, r.status === 401, `status=${r.status}`)

  // A10 DB 교차검증: 신규 고객 auth identity 링크 확인
  const linked = ctx.db.count(`select count(*) from auth_identity ai join provider_identity pi on pi.auth_identity_id=ai.id and pi.provider='emailpass' where ai.app_metadata->>'customer_id'='${state.fresh.customerId}';`)
  ctx.assert("A10", "DB: 신규 auth identity 링크", (linked ?? 0) >= 1, `linked_rows=${linked}`, "≥1")
}
