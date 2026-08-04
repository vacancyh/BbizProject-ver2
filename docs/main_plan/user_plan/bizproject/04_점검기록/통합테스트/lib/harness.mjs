// 통합테스트 공용 harness — HTTP 클라이언트 · 기록기 · 로그인 · 리포트 생성.
// 각 suite 는 ctx 를 받아 ctx.rec(...) 로 결과를 남긴다. run-all.mjs 가 suite 들을 독립 실행한다.
import { writeFileSync } from "node:fs"
import { dbRows, dbCount } from "./db.mjs"

export function makeCtx() {
  const BASE = process.env.BASE || "http://localhost:9009"
  const PUB = process.env.PUBKEY || ""
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@shop.local"
  const ADMIN_PW = process.env.ADMIN_PW || "admin1234!"
  const DEMO_PW = "test1234!"

  const results = []
  let area = ""

  const state = {
    adminToken: null, tokens: {}, fresh: {},
    productId: null, variantId: null, regionId: null, scId: null,
    orderIds: {}, customerIds: {},
  }

  async function http(method, path, opts = {}) {
    const { token, pub = true, body, headers = {} } = opts
    const h = { "content-type": "application/json", ...headers }
    if (pub && PUB) h["x-publishable-api-key"] = PUB
    if (token) h["authorization"] = `Bearer ${token}`
    let res, json = null, text = null, err = null
    try {
      res = await fetch(BASE + path, { method, headers: h, body: body !== undefined ? JSON.stringify(body) : undefined })
      const ct = res.headers.get("content-type") || ""
      if (ct.includes("application/json")) { try { json = await res.json() } catch { /**/ } }
      else { try { text = await res.text() } catch { /**/ } }
    } catch (e) { err = e?.message || String(e) }
    return { status: res?.status ?? 0, ok: res?.ok ?? false, json, text, err }
  }

  function setArea(a) { area = a }

  function rec(id, name, method, path, expect, res, pass, evidence) {
    results.push({
      area, id, name, method, path, expect,
      status: res?.status ?? 0, pass: !!pass, evidence: (evidence ?? "").toString(), err: res?.err ?? null,
    })
    console.log(`${pass ? "PASS" : "FAIL"}  [${area}] ${id} ${name}  →  ${res?.status ?? "-"}  ${evidence ?? ""}`)
    return !!pass
  }

  // 순수 판정 기록(HTTP 없이 계산 결과를 기록할 때: 동시성/멱등/DB 교차검증 등)
  function assert(id, name, pass, evidence, expect = "-") {
    results.push({ area, id, name, method: "-", path: "-", expect, status: pass ? 200 : 0, pass: !!pass, evidence: (evidence ?? "").toString(), err: null })
    console.log(`${pass ? "PASS" : "FAIL"}  [${area}] ${id} ${name}  →  ${evidence ?? ""}`)
    return !!pass
  }

  const pick = (o, ...keys) => keys.map((k) => o?.[k]).find((v) => v !== undefined)

  // ── 로그인/부트스트랩 ──────────────────────────────────────
  async function loginCustomer(email, password = DEMO_PW) {
    const r = await http("POST", "/auth/customer/emailpass", { body: { email, password } })
    return r.status === 200 ? pick(r.json || {}, "token") : null
  }
  async function loginAdmin() {
    const r = await http("POST", "/auth/user/emailpass", { pub: false, body: { email: ADMIN_EMAIL, password: ADMIN_PW } })
    return r.status === 200 ? pick(r.json || {}, "token") : null
  }

  async function bootstrap() {
    state.adminToken = await loginAdmin()
    for (const k of ["test", "silver", "gold", "vip"]) state.tokens[k] = await loginCustomer(`${k}@kr-demo.local`)
    // 대표 상품/리전/판매채널
    const pl = await http("GET", "/store/products?limit=3", {})
    state.productId = pl.json?.products?.[0]?.id
    state.variantId = pl.json?.products?.[0]?.variants?.[0]?.id
    state.productId2 = pl.json?.products?.[1]?.id
    const rl = await http("GET", "/store/regions", {})
    const region = (rl.json?.regions ?? []).find((x) => x.currency_code === "krw") ?? rl.json?.regions?.[0]
    state.regionId = region?.id
    // 데모 고객 id (DB 조회)
    const rows = dbRows("select split_part(email,'@',1), id from customer where email like '%@kr-demo.local' and split_part(email,'@',1) in ('test','silver','gold','vip');")
    if (rows) for (const [k, id] of rows) state.customerIds[k] = id
  }

  // ── 리포트 생성 ────────────────────────────────────────────
  function writeReports(dir, meta = {}) {
    const total = results.length
    const passed = results.filter((r) => r.pass).length
    const failed = total - passed
    const byArea = {}
    for (const r of results) {
      byArea[r.area] ??= { pass: 0, fail: 0, rows: [] }
      byArea[r.area][r.pass ? "pass" : "fail"]++
      byArea[r.area].rows.push(r)
    }
    const stamp = process.env.RUN_STAMP || meta.stamp || "(시각 미기록)"
    let md = `# BbizProject 통합테스트 리포트 (분할·다중방법)\n\n`
    md += `- 실행: ${stamp}\n- 대상: \`${BASE}\` (API 계층, shop_test DB)\n- 결과: **${passed}/${total} PASS** · 실패 ${failed}\n\n`
    md += `> \`run-all.mjs\` 가 도메인별 suite 를 독립 실행하고 자동 생성. 재실행: README.md 참고.\n\n`
    md += `## 도메인(영역)별 요약\n\n| 영역 | PASS | FAIL |\n|---|---|---|\n`
    for (const [a, v] of Object.entries(byArea)) md += `| ${a} | ${v.pass} | ${v.fail} |\n`
    md += `\n## 상세 결과\n\n`
    for (const [a, v] of Object.entries(byArea)) {
      md += `### ${a}  (${v.pass}/${v.pass + v.fail})\n\n`
      md += `| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |\n|---|---|---|---|---|---|---|---|\n`
      for (const r of v.rows) md += `| ${r.id} | ${r.name} | ${r.method} | \`${r.path}\` | ${r.expect} | ${r.status} | ${r.pass ? "✅" : "❌"} | ${(r.evidence || r.err || "").replace(/\|/g, "\\|").slice(0, 90)} |\n`
      md += `\n`
    }
    if (failed > 0) {
      md += `## 실패 케이스\n\n`
      for (const r of results.filter((x) => !x.pass)) md += `- **${r.id} ${r.name}** [${r.area}] (${r.method} \`${r.path}\`) → ${r.status} ${r.err ? "· " + r.err : ""} · ${r.evidence}\n`
    }
    writeFileSync(`${dir}/REPORT.md`, md)
    writeFileSync(`${dir}/results.json`, JSON.stringify({ stamp, base: BASE, total, passed, failed, results }, null, 2))
    return { total, passed, failed }
  }

  return {
    BASE, PUB, ADMIN_EMAIL, ADMIN_PW, DEMO_PW,
    results, state, http, rec, assert, setArea, pick,
    loginCustomer, loginAdmin, bootstrap, writeReports,
    db: { rows: dbRows, count: dbCount },
  }
}
