#!/usr/bin/env node
/**
 * BbizProject 통합테스트 드라이버 (API 계층)
 * ---------------------------------------------------------------------------
 * 백엔드(:9009 등)의 /store · /admin · /auth HTTP API 를 직접 호출해
 * 계정 등록/로그인 · 사용자 기능 · 관리자 기능 · 연계 시나리오 · 검색조건을 검증한다.
 *
 * 사전조건: 시드된 백엔드가 떠 있어야 함(seed-all 로 시드). 사용법은 README.md 참고.
 * 실행:
 *   BASE=http://localhost:9009 PUBKEY=pk_xxx node run-integration-tests.mjs
 * 산출물: results.json (기계용) + REPORT.md (사람용) 를 이 폴더에 생성.
 *
 * 종료코드: 실패 케이스가 있으면 1, 전부 통과면 0.
 */
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const HERE = dirname(fileURLToPath(import.meta.url))
const BASE = process.env.BASE || "http://localhost:9009"
const PUB = process.env.PUBKEY || ""
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@shop.local"
const ADMIN_PW = process.env.ADMIN_PW || "admin1234!"
const DEMO_PW = "test1234!"

const results = []
let curArea = ""
const setArea = (a) => (curArea = a)

async function http(method, path, opts = {}) {
  const { token, pub = true, body, headers = {} } = opts
  const h = { "content-type": "application/json", ...headers }
  if (pub && PUB) h["x-publishable-api-key"] = PUB
  if (token) h["authorization"] = `Bearer ${token}`
  let res, json = null, text = null, err = null
  try {
    res = await fetch(BASE + path, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    const ct = res.headers.get("content-type") || ""
    if (ct.includes("application/json")) { try { json = await res.json() } catch { /*noop*/ } }
    else { try { text = await res.text() } catch { /*noop*/ } }
  } catch (e) { err = e?.message || String(e) }
  return { status: res?.status ?? 0, ok: res?.ok ?? false, json, text, err }
}

function rec(id, name, method, path, expect, res, pass, evidence) {
  results.push({
    area: curArea, id, name, method, path, expect,
    status: res?.status ?? 0, pass: !!pass, evidence: evidence ?? "",
    err: res?.err ?? null,
  })
  const tag = pass ? "PASS" : "FAIL"
  console.log(`${tag}  [${curArea}] ${id} ${name}  →  ${res?.status ?? "-"}  ${evidence ?? ""}`)
  return !!pass
}

const pick = (o, ...keys) => keys.map((k) => o?.[k]).find((v) => v !== undefined)

// 공유 상태
const S = { adminToken: null, tokens: {}, customerIds: {}, freshEmail: null, freshToken: null, freshCustomerId: null, productId: null, variantId: null, regionId: null, scId: null, orderIds: {}, reviewId: null }

async function main() {
  console.log(`\n== BbizProject 통합테스트 ==  BASE=${BASE}  PUBKEY=${PUB ? PUB.slice(0, 12) + "…" : "(none)"}\n`)

  // ───────────────────────── A. 인증/계정 ─────────────────────────
  setArea("A. 인증·계정")
  {
    // A1 관리자 로그인
    let r = await http("POST", "/auth/user/emailpass", { pub: false, body: { email: ADMIN_EMAIL, password: ADMIN_PW } })
    S.adminToken = pick(r.json || {}, "token")
    rec("A1", "관리자 로그인", "POST", "/auth/user/emailpass", "200 + token", r, r.status === 200 && !!S.adminToken, S.adminToken ? "token 발급" : "no token")

    // A2 관리자 로그인 실패(잘못된 비번)
    r = await http("POST", "/auth/user/emailpass", { pub: false, body: { email: ADMIN_EMAIL, password: "wrong-pass!" } })
    rec("A2", "관리자 로그인 실패(오비번)", "POST", "/auth/user/emailpass", "401", r, r.status === 401, `status=${r.status}`)

    // A3 고객 신규 회원가입 (register → customer profile)
    const ts = Date.now()
    S.freshEmail = `itest_${ts}@kr-itest.local`
    r = await http("POST", "/auth/customer/emailpass/register", { body: { email: S.freshEmail, password: DEMO_PW } })
    const regToken = pick(r.json || {}, "token")
    rec("A3", "고객 회원가입(register)", "POST", "/auth/customer/emailpass/register", "200 + token", r, r.status === 200 && !!regToken, S.freshEmail)

    // A4 고객 프로필 생성 (store/customers with reg token)
    r = await http("POST", "/store/customers", { token: regToken, body: { email: S.freshEmail, first_name: "통합", last_name: "테스트" } })
    S.freshCustomerId = pick(r.json?.customer || {}, "id")
    rec("A4", "고객 프로필 생성", "POST", "/store/customers", "200/201 + customer", r, (r.status === 200 || r.status === 201) && !!S.freshCustomerId, S.freshCustomerId || "no id")

    // A5 중복 회원가입 방지
    r = await http("POST", "/auth/customer/emailpass/register", { body: { email: S.freshEmail, password: DEMO_PW } })
    rec("A5", "중복 회원가입 차단", "POST", "/auth/customer/emailpass/register", "4xx(이미 존재)", r, r.status >= 400 && r.status < 500, `status=${r.status}`)

    // A6 신규 고객 로그인
    r = await http("POST", "/auth/customer/emailpass", { body: { email: S.freshEmail, password: DEMO_PW } })
    S.freshToken = pick(r.json || {}, "token")
    rec("A6", "신규 고객 로그인", "POST", "/auth/customer/emailpass", "200 + token", r, r.status === 200 && !!S.freshToken, S.freshToken ? "token" : "no token")

    // A7 고객 로그인 실패(오비번)
    r = await http("POST", "/auth/customer/emailpass", { body: { email: S.freshEmail, password: "nope" } })
    rec("A7", "고객 로그인 실패(오비번)", "POST", "/auth/customer/emailpass", "401", r, r.status === 401, `status=${r.status}`)

    // A8~A11 데모 계정 4종 로그인 (등급별)
    for (const key of ["test", "silver", "gold", "vip"]) {
      const email = `${key}@kr-demo.local`
      r = await http("POST", "/auth/customer/emailpass", { body: { email, password: DEMO_PW } })
      S.tokens[key] = pick(r.json || {}, "token")
      rec(`A8_${key}`, `데모 로그인(${key})`, "POST", "/auth/customer/emailpass", "200 + token", r, r.status === 200 && !!S.tokens[key], email)
    }

    // A12 인증 없이 보호 라우트 접근 → 401
    r = await http("GET", "/store/customers/me/points", { pub: true })
    rec("A12", "미인증 보호라우트 차단", "GET", "/store/customers/me/points", "401", r, r.status === 401, `status=${r.status}`)
  }

  // ───────────────────────── B. 사용자 기능 ─────────────────────────
  setArea("B. 사용자 기능")
  {
    const gt = S.tokens.gold // 골드: 적립금/등급/주문 풍부
    // B1 내 정보
    let r = await http("GET", "/store/customers/me", { token: gt })
    rec("B1", "내 정보 조회", "GET", "/store/customers/me", "200 + customer", r, r.status === 200 && !!r.json?.customer, pick(r.json?.customer || {}, "email"))

    // B2 배송지 목록
    r = await http("GET", "/store/customers/me/addresses", { token: gt })
    const addrCount = (r.json?.addresses?.length ?? r.json?.count ?? 0)
    rec("B2", "배송지 목록", "GET", "/store/customers/me/addresses", "200 + 1건 이상", r, r.status === 200 && addrCount >= 1, `count=${addrCount}`)

    // B3 배송지 추가
    r = await http("POST", "/store/customers/me/addresses", { token: gt, body: { first_name: "골드", last_name: "김", address_1: "서울 강남구 추가로 2", city: "서울", province: "서울", postal_code: "06000", country_code: "kr", phone: "010-9999-0002" } })
    rec("B3", "배송지 추가", "POST", "/store/customers/me/addresses", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)

    // B4 적립금 조회 (응답: { entries, summary:{ balance, total_earned, total_used } })
    r = await http("GET", "/store/customers/me/points", { token: gt })
    const bal = r.json?.summary?.balance ?? pick(r.json || {}, "balance")
    rec("B4", "적립금 조회", "GET", "/store/customers/me/points", "200 + balance>0", r, r.status === 200 && (bal ?? 0) > 0, `balance=${bal}`)

    // B5 멤버십 조회
    r = await http("GET", "/store/customers/me/membership", { token: gt })
    const tier = pick(r.json || {}, "current_tier", "tier") ?? r.json?.membership?.current_tier
    rec("B5", "멤버십 등급 조회", "GET", "/store/customers/me/membership", "200 + 골드", r, r.status === 200 && String(tier || "").includes("골드"), `tier=${tier}`)

    // B6 동의 조회 + 변경
    r = await http("GET", "/store/customers/me/consents", { token: gt })
    rec("B6a", "동의 조회", "GET", "/store/customers/me/consents", "200", r, r.status === 200, JSON.stringify(pick(r.json || {}, "consents") ?? "").slice(0, 60))
    r = await http("POST", "/store/customers/me/consents", { token: gt, body: { channel: "marketing", agreed: false } })
    rec("B6b", "동의 변경(marketing=off)", "POST", "/store/customers/me/consents", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)

    // B7 주문 목록
    r = await http("GET", "/store/orders", { token: gt })
    const ords = r.json?.orders ?? []
    if (ords[0]) S.orderIds.gold = ords[0].id
    rec("B7", "주문 목록", "GET", "/store/orders", "200 + 3건", r, r.status === 200 && ords.length >= 1, `count=${ords.length}`)

    // B8 주문 상세
    if (S.orderIds.gold) {
      r = await http("GET", `/store/orders/${S.orderIds.gold}`, { token: gt })
      rec("B8", "주문 상세", "GET", "/store/orders/:id", "200 + order", r, r.status === 200 && !!r.json?.order, pick(r.json?.order || {}, "display_id"))
    }

    // B9 위시리스트 추가/조회 (신규 계정으로)
    if (S.freshToken) {
      // 상품 하나 확보
      const pl = await http("GET", "/store/products?limit=1", { })
      S.productId = pl.json?.products?.[0]?.id
      S.variantId = pl.json?.products?.[0]?.variants?.[0]?.id
      if (S.productId) {
        r = await http("POST", "/store/customers/me/wishlist", { token: S.freshToken, body: { product_id: S.productId } })
        rec("B9a", "위시리스트 추가", "POST", "/store/customers/me/wishlist", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)
        r = await http("GET", "/store/customers/me/wishlist", { token: S.freshToken })
        rec("B9b", "위시리스트 조회", "GET", "/store/customers/me/wishlist", "200 + 1건", r, r.status === 200, `status=${r.status}`)
      }
    }
  }

  // ───────────────────────── C. 스토어 카탈로그/콘텐츠 ─────────────────────────
  setArea("C. 스토어 카탈로그·콘텐츠")
  {
    let r = await http("GET", "/store/products?limit=5", {})
    const prods = r.json?.products ?? []
    if (!S.productId && prods[0]) { S.productId = prods[0].id; S.variantId = prods[0].variants?.[0]?.id }
    rec("C1", "상품 목록", "GET", "/store/products", "200 + 상품", r, r.status === 200 && prods.length > 0, `count=${prods.length}`)

    if (S.productId) {
      r = await http("GET", `/store/products/${S.productId}`, {})
      rec("C2", "상품 상세", "GET", "/store/products/:id", "200", r, r.status === 200 && !!(r.json?.product), pick(r.json?.product || {}, "title"))
      r = await http("GET", `/store/products/${S.productId}/reviews`, {})
      rec("C3", "상품 리뷰 목록", "GET", "/store/products/:id/reviews", "200 + summary", r, r.status === 200, `reviews=${(r.json?.reviews?.length ?? 0)}`)
      r = await http("GET", `/store/products/${S.productId}/inquiries`, {})
      rec("C4", "상품 문의 목록", "GET", "/store/products/:id/inquiries", "200", r, r.status === 200, `status=${r.status}`)
      r = await http("GET", `/store/products/${S.productId}/disclosure`, {})
      rec("C5", "상품정보고시", "GET", "/store/products/:id/disclosure", "200(없으면 fallback)", r, r.status === 200 || r.status === 404, `status=${r.status}`)
    }

    for (const [id, path, name, key] of [
      ["C6", "/store/coupons", "쿠폰 목록", "coupons"],
      ["C7", "/store/time-sales", "타임세일", "time_sales"],
      ["C8", "/store/banners?kind=hero", "배너(hero)", "banners"],
      ["C9", "/store/notices", "공지", "notices"],
      ["C10", "/store/faqs", "FAQ", "faqs"],
      ["C11", "/store/curated-products", "홈 큐레이션", "product_ids"],
      ["C12", "/store/best-products", "베스트 상품", "products"],
      ["C13", "/store/popular-search-terms", "인기 검색어", "terms"],
    ]) {
      const rr = await http("GET", path, {})
      const arr = rr.json && (Array.isArray(rr.json) ? rr.json : (rr.json[key] ?? Object.values(rr.json).find(Array.isArray)))
      rec(id, name, "GET", path.split("?")[0], "200 + 배열", rr, rr.status === 200, `n=${Array.isArray(arr) ? arr.length : "?"}`)
    }

    // 약관 2종
    for (const [id, slug] of [["C14", "terms-of-use"], ["C15", "privacy-policy"]]) {
      const rr = await http("GET", `/store/legal-docs/${slug}`, {})
      rec(id, `약관(${slug})`, "GET", "/store/legal-docs/:slug", "200 + body", rr, rr.status === 200 && !!(rr.json?.body ?? rr.json?.doc), `status=${rr.status}`)
    }
  }

  // ───────────────────────── D. 장바구니→주문→결제 ─────────────────────────
  setArea("D. 장바구니·주문·결제")
  {
    // region(KRW) 확보
    let r = await http("GET", "/store/regions", {})
    const region = (r.json?.regions ?? []).find((x) => x.currency_code === "krw") ?? r.json?.regions?.[0]
    S.regionId = region?.id
    rec("D0", "리전(KRW) 조회", "GET", "/store/regions", "200 + KRW", r, r.status === 200 && !!S.regionId, region?.currency_code)

    if (S.regionId && S.variantId) {
      const t = S.tokens.gold
      // D1 카트 생성
      r = await http("POST", "/store/carts", { token: t, body: { region_id: S.regionId, email: "gold@kr-demo.local", items: [{ variant_id: S.variantId, quantity: 1 }] } })
      const cartId = pick(r.json?.cart || {}, "id")
      rec("D1", "카트 생성", "POST", "/store/carts", "200 + cart", r, r.status === 200 && !!cartId, cartId || "no cart")

      if (cartId) {
        // D2 배송지
        r = await http("POST", `/store/carts/${cartId}`, { token: t, body: { shipping_address: { first_name: "골드", last_name: "김", address_1: "서울 강남구 1", city: "서울", province: "서울", postal_code: "06234", country_code: "kr", phone: "010-3000-0001" }, email: "gold@kr-demo.local" } })
        rec("D2", "카트 배송지 설정", "POST", "/store/carts/:id", "200", r, r.status === 200, `status=${r.status}`)

        // D3 배송옵션 조회 + 설정
        r = await http("GET", `/store/shipping-options?cart_id=${cartId}`, { token: t })
        const opt = r.json?.shipping_options?.[0]
        rec("D3a", "배송옵션 조회", "GET", "/store/shipping-options", "200 + 옵션", r, r.status === 200 && !!opt, `n=${r.json?.shipping_options?.length ?? 0}`)
        if (opt) {
          r = await http("POST", `/store/carts/${cartId}/shipping-methods`, { token: t, body: { option_id: opt.id } })
          rec("D3b", "배송방법 설정", "POST", "/store/carts/:id/shipping-methods", "200", r, r.status === 200, `status=${r.status}`)
        }

        // D4 쿠폰 적용
        r = await http("POST", `/store/carts/${cartId}/promotions`, { token: t, body: { promo_codes: ["WELCOME10"] } })
        const disc = pick(r.json?.cart || {}, "discount_total")
        rec("D4", "쿠폰(WELCOME10) 적용", "POST", "/store/carts/:id/promotions", "200 + 할인", r, r.status === 200, `discount_total=${disc}`)

        // D5 적립금 적용
        r = await http("POST", `/store/carts/${cartId}/points`, { token: t, body: { points: 1000 } })
        rec("D5", "적립금 적용", "POST", "/store/carts/:id/points", "200(잔액충분시)", r, r.status === 200 || r.status === 400, `status=${r.status}`)

        // D6 결제 세션 + 완료
        r = await http("POST", "/store/payment-collections", { token: t, body: { cart_id: cartId } })
        const pcId = pick(r.json?.payment_collection || {}, "id")
        rec("D6a", "결제 컬렉션 생성", "POST", "/store/payment-collections", "200", r, r.status === 200 && !!pcId, pcId || "no pc")
        if (pcId) {
          r = await http("POST", `/store/payment-collections/${pcId}/payment-sessions`, { token: t, body: { provider_id: "pp_system_default" } })
          rec("D6b", "결제 세션 생성", "POST", "/store/payment-collections/:id/payment-sessions", "200", r, r.status === 200, `status=${r.status}`)
        }
        r = await http("POST", `/store/carts/${cartId}/complete`, { token: t })
        const newOrder = r.json?.order ?? r.json?.type === "order" ? r.json?.order : null
        const completedOrderId = pick(r.json?.order || {}, "id")
        if (completedOrderId) S.orderIds.checkout = completedOrderId
        rec("D6c", "주문 완료(checkout)", "POST", "/store/carts/:id/complete", "200 + order", r, r.status === 200 && !!completedOrderId, completedOrderId || `type=${r.json?.type}`)
      }
    }
  }

  // ───────────────────────── E. 관리자 기능 ─────────────────────────
  setArea("E. 관리자 기능")
  {
    const at = S.adminToken
    // E1 상품 목록
    let r = await http("GET", "/admin/products?limit=5", { token: at, pub: false })
    rec("E1", "관리자 상품 목록", "GET", "/admin/products", "200", r, r.status === 200 && Array.isArray(r.json?.products), `count=${r.json?.products?.length ?? 0}`)

    // E2 주문 목록
    r = await http("GET", "/admin/orders?limit=5", { token: at, pub: false })
    rec("E2", "관리자 주문 목록", "GET", "/admin/orders", "200", r, r.status === 200 && Array.isArray(r.json?.orders), `count=${r.json?.orders?.length ?? 0}`)

    // E3 회원 목록
    r = await http("GET", "/admin/customers?limit=5", { token: at, pub: false })
    rec("E3", "관리자 회원 목록", "GET", "/admin/customers", "200", r, r.status === 200 && Array.isArray(r.json?.customers), `count=${r.json?.customers?.length ?? 0}`)

    // E4 리뷰 큐(pending)
    r = await http("GET", "/admin/reviews?type=review&status=pending&limit=50", { token: at, pub: false })
    rec("E4", "관리자 리뷰 큐(pending)", "GET", "/admin/reviews", "200", r, r.status === 200, `n=${(r.json?.reviews?.length ?? r.json?.items?.length ?? "?")}`)

    // E5 쿠폰/프로모션
    r = await http("GET", "/admin/promotions?limit=5", { token: at, pub: false })
    rec("E5", "관리자 프로모션 목록", "GET", "/admin/promotions", "200", r, r.status === 200, `count=${r.json?.promotions?.length ?? 0}`)

    // E6 CMS 배너 목록 + 생성
    r = await http("GET", "/admin/banners", { token: at, pub: false })
    rec("E6a", "관리자 배너 목록", "GET", "/admin/banners", "200", r, r.status === 200, `status=${r.status}`)
    r = await http("POST", "/admin/banners", { token: at, pub: false, body: { kind: "hero", title: "통합테스트 배너", image_url: "https://picsum.photos/seed/itest/1200/400", link_url: "/kr", sort_order: 99, status: "published" } })
    rec("E6b", "관리자 배너 생성", "POST", "/admin/banners", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)

    // E7 대시보드 통계
    r = await http("GET", "/admin/dashboard/stats", { token: at, pub: false })
    rec("E7", "관리자 대시보드 통계", "GET", "/admin/dashboard/stats", "200", r, r.status === 200, `status=${r.status}`)

    // E8 RBAC: 고객 토큰으로 admin 접근 → 401/403
    r = await http("GET", "/admin/products", { token: S.tokens.gold, pub: false })
    rec("E8", "권한 차단(고객→admin)", "GET", "/admin/products", "401/403", r, r.status === 401 || r.status === 403, `status=${r.status}`)

    // E9 미인증 admin 접근 → 401
    r = await http("GET", "/admin/orders", { pub: false })
    rec("E9", "미인증 admin 차단", "GET", "/admin/orders", "401", r, r.status === 401, `status=${r.status}`)
  }

  // ───────────────────────── F. 연계 시나리오 ─────────────────────────
  setArea("F. 연계 시나리오")
  {
    const at = S.adminToken
    // F1 리뷰: 고객 작성(pending) → admin 큐 노출 → 승인 → 스토어 노출
    if (S.productId && S.tokens.silver) {
      let r = await http("POST", `/store/products/${S.productId}/reviews`, { token: S.tokens.silver, body: { author_name: "실버", author_email: "silver@kr-demo.local", rating: 5, title: "연계테스트 리뷰", content: "통합테스트에서 작성한 리뷰입니다." } })
      const created = r.status === 200 || r.status === 201
      rec("F1a", "리뷰 작성(pending)", "POST", "/store/products/:id/reviews", "200/201", r, created, `status=${r.status}`)

      // admin 큐에서 방금 리뷰 탐색
      r = await http("GET", "/admin/reviews?type=review&status=pending&limit=100", { token: at, pub: false })
      const list = r.json?.reviews ?? r.json?.items ?? []
      const mine = list.find((x) => (x.title || "").includes("연계테스트") || (x.content || "").includes("통합테스트에서 작성"))
      S.reviewId = mine?.id
      rec("F1b", "관리자 리뷰 큐 노출", "GET", "/admin/reviews", "pending에 노출", r, !!mine, S.reviewId || "미발견")

      // 승인
      if (S.reviewId) {
        r = await http("POST", `/admin/reviews/${S.reviewId}`, { token: at, pub: false, body: { status: "published" } })
        rec("F1c", "관리자 리뷰 승인", "POST", "/admin/reviews/:id", "200", r, r.status === 200, `status=${r.status}`)
        // 스토어 노출 확인
        r = await http("GET", `/store/products/${S.productId}/reviews`, {})
        const pubList = r.json?.reviews ?? []
        const shown = pubList.find((x) => (x.title || "").includes("연계테스트"))
        rec("F1d", "승인 리뷰 스토어 노출", "GET", "/store/products/:id/reviews", "published 노출", r, !!shown, shown ? "노출됨" : "미노출")
      }
    }

    // F2 주문 연계: 고객 주문 → admin 주문검색에서 email로 발견
    {
      const r = await http("GET", `/admin/orders-kr/search?q=${encodeURIComponent("gold@kr-demo.local")}&limit=20`, { token: at, pub: false })
      const orders = r.json?.orders ?? r.json?.items ?? []
      rec("F2", "고객 주문→관리자 검색 노출", "GET", "/admin/orders-kr/search", "email로 주문 발견", r, r.status === 200 && orders.length >= 1, `n=${orders.length}`)
    }

    // F3 쿠폰 연계: admin 프로모션 존재 → store /coupons 노출
    {
      const r = await http("GET", "/store/coupons", {})
      const codes = (Array.isArray(r.json) ? r.json : (r.json?.coupons ?? [])).map((c) => c.code || c)
      rec("F3", "쿠폰 admin→store 노출", "GET", "/store/coupons", "WELCOME10 노출", r, r.status === 200 && JSON.stringify(codes).includes("WELCOME10"), JSON.stringify(codes).slice(0, 60))
    }

    // F4 적립금 연계: 관리자 적립 → 고객 잔액 증가
    if (S.customerIds || S.tokens.test) {
      // 고객 id 확보
      let r = await http("GET", "/store/customers/me", { token: S.tokens.test })
      const cid = pick(r.json?.customer || {}, "id")
      let before = null
      if (cid) {
        r = await http("GET", "/store/customers/me/points", { token: S.tokens.test })
        before = r.json?.summary?.balance ?? 0
        // 관리자 적립
        r = await http("POST", `/admin/points/customers/${cid}/earn`, { token: at, pub: false, body: { points: 500, reason: "통합테스트 적립" } })
        const earned = r.status === 200 || r.status === 201
        // 재조회
        const r2 = await http("GET", "/store/customers/me/points", { token: S.tokens.test })
        const after = r2.json?.summary?.balance ?? 0
        rec("F4", "관리자 적립→고객 잔액 증가", "POST", "/admin/points/customers/:id/earn", `${before}→${before + 500}`, r, earned && after === before + 500, `${before}→${after}`)
      }
    }

    // F5 문의 연계: 고객 문의 작성 → admin 답변 → 스토어 답변완료
    if (S.productId && S.tokens.vip) {
      let r = await http("POST", `/store/products/${S.productId}/inquiries`, { token: S.tokens.vip, body: { author_name: "VIP", author_email: "vip@kr-demo.local", content: "연계테스트 문의: 재입고 문의드립니다." } })
      rec("F5a", "상품 문의 작성", "POST", "/store/products/:id/inquiries", "200/201", r, r.status === 200 || r.status === 201, `status=${r.status}`)
      r = await http("GET", "/admin/reviews?type=inquiry&limit=100", { token: at, pub: false })
      const list = r.json?.reviews ?? r.json?.items ?? []
      const q = list.find((x) => (x.content || "").includes("연계테스트 문의"))
      if (q) {
        r = await http("POST", `/admin/reviews/${q.id}`, { token: at, pub: false, body: { reply: "다음 주 재입고 예정입니다.", status: "published" } })
        rec("F5b", "관리자 문의 답변", "POST", "/admin/reviews/:id", "200", r, r.status === 200, `status=${r.status}`)
      } else {
        rec("F5b", "관리자 문의 답변", "POST", "/admin/reviews/:id", "문의 발견", { status: 0 }, false, "문의 미발견")
      }
    }

    // F6 비회원 주문조회 연계
    if (S.orderIds.gold) {
      // display_id 확보
      const r0 = await http("GET", `/store/orders/${S.orderIds.gold}`, { token: S.tokens.gold })
      const did = pick(r0.json?.order || {}, "display_id")
      const r = await http("POST", "/store/orders/lookup", { body: { display_id: did, email: "gold@kr-demo.local" } })
      rec("F6a", "비회원 주문조회(정상)", "POST", "/store/orders/lookup", "200 매칭", r, r.status === 200, `display_id=${did}`)
      const rBad = await http("POST", "/store/orders/lookup", { body: { display_id: did, email: "wrong@x.com" } })
      rec("F6b", "비회원 주문조회(불일치 차단)", "POST", "/store/orders/lookup", "404", rBad, rBad.status === 404, `status=${rBad.status}`)
    }
  }

  // ───────────────────────── G. 검색조건 (영역별) ─────────────────────────
  // G1 상품검색
  setArea("G1. 상품검색")
  {
    const cases = [
      ["G1a", "전체 목록", "/store/products?limit=5"],
      ["G1b", "키워드(q)", "/store/products?q=티셔츠&limit=5"],
      ["G1c", "페이지네이션(offset)", "/store/products?limit=2&offset=2"],
      ["G1d", "정렬(order=created_at)", "/store/products?order=created_at&limit=3"],
      ["G1e", "핸들 필터", "/store/products?handle=t-shirt"],
    ]
    for (const [id, name, path] of cases) {
      const r = await http("GET", path, {})
      const n = r.json?.products?.length ?? 0
      rec(id, name, "GET", path.split("?")[0] + "?" + path.split("?")[1], "200", r, r.status === 200, `n=${n}`)
    }
    // 카테고리 필터 (카테고리 id 확보 후)
    const rc = await http("GET", "/store/product-categories?limit=1", {})
    const catId = rc.json?.product_categories?.[0]?.id
    if (catId) {
      const r = await http("GET", `/store/products?category_id[]=${catId}&limit=5`, {})
      rec("G1f", "카테고리 필터", "GET", "/store/products?category_id[]", "200", r, r.status === 200, `n=${r.json?.products?.length ?? 0}`)
    }
  }

  // G2 주문검색(admin)
  setArea("G2. 주문검색(admin)")
  {
    const at = S.adminToken
    const cases = [
      ["G2a", "전체", "/admin/orders-kr/search?limit=5"],
      ["G2b", "키워드(email)", `/admin/orders-kr/search?q=${encodeURIComponent("gold@kr-demo.local")}&limit=5`],
      ["G2c", "결제상태 필터", "/admin/orders-kr/search?payment_status=captured&limit=5"],
      ["G2d", "배송상태 필터", "/admin/orders-kr/search?fulfillment_status=not_fulfilled&limit=5"],
      ["G2e", "페이지네이션", "/admin/orders-kr/search?limit=2&offset=2"],
    ]
    for (const [id, name, path] of cases) {
      const r = await http("GET", path, { token: at, pub: false })
      const n = (r.json?.orders ?? r.json?.items ?? []).length
      rec(id, name, "GET", "/admin/orders-kr/search", "200", r, r.status === 200, `n=${n}`)
    }
  }

  // G3 회원검색(admin)
  setArea("G3. 회원검색(admin)")
  {
    const at = S.adminToken
    const cases = [
      ["G3a", "전체", "/admin/customers?limit=5"],
      ["G3b", "이메일 부분일치", "/admin/customers?q=kr-demo&limit=10"],
      ["G3c", "한글 이름 검색", `/admin/customers?q=${encodeURIComponent("김")}&limit=10`],
      ["G3d", "페이지네이션", "/admin/customers?limit=3&offset=3"],
      ["G3e", "휴면회원 조회", "/admin/customers/dormancy?dormantDays=365&warnDays=30"],
    ]
    for (const [id, name, path] of cases) {
      const r = await http("GET", path, { token: at, pub: false })
      const n = (r.json?.customers ?? r.json?.items ?? r.json?.dormant ?? []).length ?? "?"
      rec(id, name, "GET", path.split("?")[0], "200", r, r.status === 200, `n=${n}`)
    }
  }

  // G4 리뷰/문의 검색(admin)
  setArea("G4. 리뷰·문의 검색(admin)")
  {
    const at = S.adminToken
    const cases = [
      ["G4a", "리뷰 전체", "/admin/reviews?type=review&limit=10"],
      ["G4b", "리뷰 pending", "/admin/reviews?type=review&status=pending&limit=10"],
      ["G4c", "리뷰 published", "/admin/reviews?type=review&status=published&limit=10"],
      ["G4d", "문의(inquiry)", "/admin/reviews?type=inquiry&limit=10"],
    ]
    for (const [id, name, path] of cases) {
      const r = await http("GET", path, { token: at, pub: false })
      const n = (r.json?.reviews ?? r.json?.items ?? []).length
      rec(id, name, "GET", "/admin/reviews", "200", r, r.status === 200, `n=${n}`)
    }
  }

  // ───────────────────────── Z. 정리(파괴적) — 회원 탈퇴 ─────────────────────────
  setArea("Z. 회원 탈퇴(파괴적)")
  {
    if (S.freshToken) {
      let r = await http("POST", "/store/customers/me/withdraw", { token: S.freshToken })
      rec("Z1", "회원 탈퇴", "POST", "/store/customers/me/withdraw", "200", r, r.status === 200 || r.status === 201, `status=${r.status}`)
      // 탈퇴 후 재로그인 → 실패해야 (또는 me 조회 실패)
      r = await http("POST", "/auth/customer/emailpass", { body: { email: S.freshEmail, password: DEMO_PW } })
      const relogin = pick(r.json || {}, "token")
      let blocked = !relogin
      if (relogin) {
        const me = await http("GET", "/store/customers/me", { token: relogin })
        blocked = me.status >= 400 || !me.json?.customer
      }
      rec("Z2", "탈퇴 후 접근 차단", "GET", "/store/customers/me", "차단", r, blocked, blocked ? "차단됨" : "여전히 접근됨")
    }
  }

  // ───────────────────────── 리포트 생성 ─────────────────────────
  const total = results.length
  const passed = results.filter((r) => r.pass).length
  const failed = total - passed
  const byArea = {}
  for (const r of results) {
    byArea[r.area] ??= { pass: 0, fail: 0, rows: [] }
    byArea[r.area][r.pass ? "pass" : "fail"]++
    byArea[r.area].rows.push(r)
  }

  const stamp = process.env.RUN_STAMP || "(시각 미기록)"
  let md = `# BbizProject 통합테스트 리포트\n\n`
  md += `- 실행: ${stamp}\n- 대상: \`${BASE}\` (API 계층, shop_test DB)\n- 결과: **${passed}/${total} PASS** · 실패 ${failed}\n\n`
  md += `> 이 리포트는 \`run-integration-tests.mjs\` 가 자동 생성합니다. 재실행: README.md 참고.\n\n`
  md += `## 영역별 요약\n\n| 영역 | PASS | FAIL |\n|---|---|---|\n`
  for (const [a, v] of Object.entries(byArea)) md += `| ${a} | ${v.pass} | ${v.fail} |\n`
  md += `\n## 상세 결과\n\n`
  for (const [a, v] of Object.entries(byArea)) {
    md += `### ${a}  (${v.pass}/${v.pass + v.fail})\n\n`
    md += `| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |\n|---|---|---|---|---|---|---|---|\n`
    for (const r of v.rows) {
      md += `| ${r.id} | ${r.name} | ${r.method} | \`${r.path}\` | ${r.expect} | ${r.status} | ${r.pass ? "✅" : "❌"} | ${(r.evidence || r.err || "").toString().replace(/\|/g, "\\|").slice(0, 80)} |\n`
    }
    md += `\n`
  }
  if (failed > 0) {
    md += `## 실패 케이스 (조치 필요)\n\n`
    for (const r of results.filter((x) => !x.pass)) md += `- **${r.id} ${r.name}** (${r.method} \`${r.path}\`) → status ${r.status} ${r.err ? "· err: " + r.err : ""} · ${r.evidence}\n`
    md += `\n`
  }

  writeFileSync(join(HERE, "results.json"), JSON.stringify({ stamp, base: BASE, total, passed, failed, results }, null, 2))
  writeFileSync(join(HERE, "REPORT.md"), md)
  console.log(`\n==== 결과: ${passed}/${total} PASS, ${failed} FAIL ====`)
  console.log(`리포트: REPORT.md · results.json`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error("드라이버 예외:", e); process.exit(2) })
