// 10 · 멱등성 + 권한 매트릭스 + 회원탈퇴 — 반복 안전성과 접근제어 표
export const meta = { area: "J. 멱등성·권한" }

export default async function run(ctx) {
  const { http, rec, assert, state, pick, DEMO_PW } = ctx

  // ── 멱등성 ──────────────────────────────────────────────
  // J1 동의 반복 설정: 같은 값 2회 → 둘 다 200, 상태 일관
  const gt = state.tokens.gold
  let r1 = await http("POST", "/store/customers/me/consents", { token: gt, body: { channel: "email", agreed: true } })
  let r2 = await http("POST", "/store/customers/me/consents", { token: gt, body: { channel: "email", agreed: true } })
  assert("J1", "동의 반복설정 멱등", (r1.status === 200 || r1.status === 201) && (r2.status === 200 || r2.status === 201), `${r1.status},${r2.status}`, "둘 다 2xx")

  // J2 위시리스트 반복 추가: 신규계정으로 같은 상품 2회 → DB 1건(dedup)
  if (state.productId) {
    const email = `idem_${Date.now()}@kr-itest.local`
    const reg = await http("POST", "/auth/customer/emailpass/register", { body: { email, password: DEMO_PW } })
    const tk = pick(reg.json || {}, "token")
    await http("POST", "/store/customers", { token: tk, body: { email, first_name: "멱등", last_name: "테" } })
    const cid = pick((await http("GET", "/store/customers/me", { token: tk })).json?.customer || {}, "id")
    await http("POST", "/store/customers/me/wishlist", { token: tk, body: { product_id: state.productId } })
    await http("POST", "/store/customers/me/wishlist", { token: tk, body: { product_id: state.productId } })
    const n = ctx.db.count(`select count(*) from product_wishlist where customer_id='${cid}' and product_id='${state.productId}' and deleted_at is null;`)
    assert("J2", "위시리스트 반복추가 dedup", (n ?? 99) <= 1, `db_rows=${n}`, "≤1")
    await http("POST", "/store/customers/me/withdraw", { token: tk })
  }

  // J3 GET 반복 안정성: 상품 목록 2회 → 동일 count
  const a = await http("GET", "/store/products?limit=10", {})
  const b = await http("GET", "/store/products?limit=10", {})
  assert("J3", "GET 반복 결과 안정", a.status === 200 && a.json?.products?.length === b.json?.products?.length, `${a.json?.products?.length}==${b.json?.products?.length}`, "동일")

  // ── 권한 매트릭스 ─────────────────────────────────────────
  // 행: 엔드포인트, 열: (미인증 / 고객토큰 / 관리자토큰) → 기대 코드
  const matrix = [
    { path: "/admin/products", type: "admin", none: [401], cust: [401, 403], admin: [200] },
    { path: "/admin/orders", type: "admin", none: [401], cust: [401, 403], admin: [200] },
    { path: "/admin/customers", type: "admin", none: [401], cust: [401, 403], admin: [200] },
    { path: "/store/customers/me/points", type: "store-me", none: [401], cust: [200], admin: [401, 403] },
  ]
  for (const m of matrix) {
    const isAdmin = m.type === "admin"
    const rNone = await http("GET", m.path, { pub: !isAdmin })
    const rCust = await http("GET", m.path, { token: state.tokens.gold, pub: !isAdmin })
    const rAdm = await http("GET", m.path, { token: state.adminToken, pub: !isAdmin })
    const ok = m.none.includes(rNone.status) && m.cust.includes(rCust.status) && m.admin.includes(rAdm.status)
    assert(`K_${m.path.replace(/\//g, "_")}`, `권한매트릭스 ${m.path}`, ok, `none=${rNone.status} cust=${rCust.status} admin=${rAdm.status}`, `${JSON.stringify(m.none)}/${JSON.stringify(m.cust)}/${JSON.stringify(m.admin)}`)
  }

  // ── 회원 탈퇴(파괴적, 마지막) ────────────────────────────
  {
    const email = `wd_${Date.now()}@kr-itest.local`
    const reg = await http("POST", "/auth/customer/emailpass/register", { body: { email, password: DEMO_PW } })
    const regTk = pick(reg.json || {}, "token")
    await http("POST", "/store/customers", { token: regTk, body: { email, first_name: "탈퇴", last_name: "테" } })
    // 프로필 생성 후 재로그인해 정식 고객 세션 토큰 확보(실제 스토어프론트 흐름과 동일)
    const login = await http("POST", "/auth/customer/emailpass", { body: { email, password: DEMO_PW } })
    const tk = pick(login.json || {}, "token") || regTk
    let r = await http("POST", "/store/customers/me/withdraw", { token: tk })
    rec("Z1", "회원 탈퇴", "POST", "/store/customers/me/withdraw", "200", r, r.status === 200 || r.status === 201, `status=${r.status}`)
    r = await http("POST", "/auth/customer/emailpass", { body: { email, password: DEMO_PW } })
    const relog = pick(r.json || {}, "token")
    let blocked = !relog
    if (relog) { const me = await http("GET", "/store/customers/me", { token: relog }); blocked = me.status >= 400 || !me.json?.customer }
    assert("Z2", "탈퇴 후 접근 차단", blocked, blocked ? "차단됨" : "여전히 접근", "차단")
  }
}
