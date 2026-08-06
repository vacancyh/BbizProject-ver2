/**
 * 다국어(콘텐츠 번역) 계약 프로브 (2026-08-05 신설)
 *
 * ── 무엇을 확인하나 ────────────────────────────────────────────────────────
 * 관리자가 넣은 번역이 **고객 화면까지 정확히 도달하는지**, 그리고
 * 번역이 **원문을 망가뜨리지 않는지**를 끝까지 확인한다.
 *
 * 특히 조용히 틀리기 쉬운 것들:
 *   · 번역이 없는데도 원문이 사라지는 것
 *   · 일부 필드만 번역했는데 나머지가 빈 값이 되는 것
 *   · 번역을 지웠는데 원문으로 안 돌아오는 것
 *   · 코어는 되는데 커스텀 모듈(공지·FAQ·배너)은 안 되는 것 (실제로 그랬다)
 *   · 로케일 헤더가 없을 때 엉뚱한 언어가 나오는 것
 *
 * ── 실행 ───────────────────────────────────────────────────────────────────
 *   BASE=http://localhost:9000 PUBKEY=pk_... node i18n-probe.mjs
 *
 * ── 안전성 ─────────────────────────────────────────────────────────────────
 * 번역 레코드를 만들었다가 **끝나면 전부 지운다.** 원본 데이터는 건드리지 않는다.
 * 중간에 죽어도 남는 것은 번역 레코드뿐이며, 지우면 원문으로 돌아온다.
 */

const BASE = process.env.BASE || "http://localhost:9000"
const PUB = process.env.PUBKEY || process.env.MEDUSA_PUBLISHABLE_KEY || ""
const ADMIN = {
  email: process.env.ADMIN_EMAIL || "admin@shop.local",
  password: process.env.ADMIN_PASSWORD || "admin1234!",
}
if (!PUB) {
  console.error("PUBKEY 가 없습니다. BASE=... PUBKEY=pk_... 로 실행하세요.")
  process.exit(2)
}

const results = []
const created = [] // 정리 대상 번역 id
let token = null

function check(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`${pass ? "  PASS" : "  FAIL"}  ${name}\n        ${detail}`)
}

async function api(path, { method = "GET", body, admin = false, locale } = {}) {
  const headers = { "content-type": "application/json" }
  if (admin) headers.authorization = `Bearer ${token}`
  else headers["x-publishable-api-key"] = PUB
  if (locale) headers["x-medusa-locale"] = locale
  const r = await fetch(BASE + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await r.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { _raw: text.slice(0, 200) }
  }
  return { status: r.status, body: json }
}

/** 번역을 만들고 정리 목록에 담는다. */
async function putTranslation(reference, id, locale, translations) {
  const r = await api("/admin/translations/batch", {
    method: "POST",
    admin: true,
    body: { create: [{ reference, reference_id: id, locale_code: locale, translations }] },
  })
  const made = r.body?.created?.[0]
  if (made?.id) created.push(made.id)
  return { status: r.status, id: made?.id }
}

async function cleanup() {
  if (!created.length) return
  await api("/admin/translations/batch", {
    method: "POST",
    admin: true,
    body: { delete: created },
  })
}

console.log(`\n다국어 계약 프로브 → ${BASE}\n${"─".repeat(70)}`)

// ── 0. 준비 ────────────────────────────────────────────────────────────────
{
  const auth = await api("/auth/user/emailpass", { method: "POST", body: ADMIN })
  token = auth.body?.token
  if (!token) {
    console.error(`관리자 로그인 실패 (status=${auth.status}). 중단합니다.`)
    process.exit(2)
  }
}

// ── 1. 지원 언어 ───────────────────────────────────────────────────────────
{
  const r = await api("/store/locales")
  const codes = (r.body?.locales ?? []).map((l) => l.code)
  check(
    "① 지원 언어에 한국어·영어가 노출된다",
    r.status === 200 && codes.includes("ko-KR") && codes.includes("en-US"),
    `status=${r.status} · ${codes.join(", ") || "(없음)"}`
  )
  check(
    "② 언어 이름이 함께 온다 (선택 UI 표시용)",
    (r.body?.locales ?? []).every((l) => l.name && l.name.length > 1),
    (r.body?.locales ?? []).map((l) => `${l.code}=${l.name}`).join(" · ")
  )
}

// ── 2. 코어 엔티티(상품) ───────────────────────────────────────────────────
let product = null
{
  const list = await api("/store/products?limit=30&fields=id,title,subtitle,description")
  product = (list.body?.products ?? []).find((p) => /[가-힣]/.test(p.title ?? ""))
  if (!product) {
    check("③ 한국어 상품 확보", false, "한글 이름 상품을 찾지 못했습니다")
  } else {
    const base = { title: product.title, description: product.description }

    // 제목만 번역한다 — 설명은 일부러 비워 둔다(부분 번역 검증)
    const put = await putTranslation("product", product.id, "en-US", {
      title: "PROBE English Title",
    })
    check("③ 관리자 API 로 번역 저장", put.status === 200 && !!put.id, `status=${put.status}`)

    const en = await api(`/store/products/${product.id}?fields=id,title,description`, {
      locale: "en-US",
    })
    check(
      "④ 영어 요청에 번역된 제목이 나온다",
      en.body?.product?.title === "PROBE English Title",
      `title=${en.body?.product?.title}`
    )
    check(
      "⑤ 번역 안 한 필드는 원문이 유지된다 (빈 값이 되면 안 됨)",
      (en.body?.product?.description ?? "") === (base.description ?? ""),
      `description=${String(en.body?.product?.description ?? "").slice(0, 40)}`
    )

    const ko = await api(`/store/products/${product.id}?fields=id,title`, { locale: "ko-KR" })
    check(
      "⑥ 한국어 요청에는 원문이 그대로",
      ko.body?.product?.title === base.title,
      `title=${ko.body?.product?.title}`
    )

    const none = await api(`/store/products/${product.id}?fields=id,title`)
    check(
      "⑦ 로케일 헤더가 없으면 원문 (기본 언어)",
      none.body?.product?.title === base.title,
      `title=${none.body?.product?.title}`
    )

    const bogus = await api(`/store/products/${product.id}?fields=id,title`, { locale: "zz-ZZ" })
    check(
      "⑧ 모르는 언어도 원문으로 응답한다 (에러 아님)",
      bogus.status === 200 && bogus.body?.product?.title === base.title,
      `status=${bogus.status} · title=${bogus.body?.product?.title}`
    )

    const listEn = await api("/store/products?limit=30&fields=id,title", { locale: "en-US" })
    const inList = (listEn.body?.products ?? []).find((p) => p.id === product.id)
    check(
      "⑨ 목록 조회에도 번역이 적용된다 (상세만 되면 안 됨)",
      inList?.title === "PROBE English Title",
      `title=${inList?.title}`
    )
  }
}

// ── 3. 코어 엔티티(카테고리) ───────────────────────────────────────────────
{
  const list = await api("/store/product-categories?limit=1")
  const cat = list.body?.product_categories?.[0]
  if (!cat) {
    check("⑩ 카테고리 번역", false, "카테고리를 찾지 못했습니다")
  } else {
    await putTranslation("product_category", cat.id, "en-US", { name: "PROBE Category" })
    const en = await api(`/store/product-categories/${cat.id}`, { locale: "en-US" })
    check(
      "⑩ 카테고리명이 번역된다",
      en.body?.product_category?.name === "PROBE Category",
      `${cat.name} → ${en.body?.product_category?.name}`
    )
  }
}

// ── 4. 커스텀 모듈 ─────────────────────────────────────────────────────────
// 코어는 이 엔티티들을 모른다. store 라우트에서 직접 적용해야만 동작한다.
{
  const cases = [
    {
      label: "공지",
      list: "/store/notices?limit=1",
      key: "notices",
      reference: "notice",
      field: "title",
      value: "PROBE Notice EN",
    },
    {
      label: "FAQ",
      list: "/store/faqs",
      key: "faqs",
      reference: "faq",
      field: "question",
      value: "PROBE FAQ EN",
    },
    {
      label: "배너",
      list: "/store/banners?kind=hero",
      key: "banners",
      reference: "banner",
      field: "title",
      value: "PROBE Banner EN",
    },
  ]

  let idx = 11
  for (const c of cases) {
    const list = await api(c.list)
    const row = (list.body?.[c.key] ?? [])[0]
    if (!row) {
      check(`⑪ ${c.label} 번역`, false, `${c.label} 데이터가 없습니다`)
      continue
    }
    const original = row[c.field]
    await putTranslation(c.reference, row.id, "en-US", { [c.field]: c.value })

    const en = await api(c.list, { locale: "en-US" })
    const enRow = (en.body?.[c.key] ?? []).find((x) => x.id === row.id)
    check(
      `${"⑪⑫⑬"[idx - 11] ?? "·"} ${c.label}(커스텀 모듈)가 번역된다`,
      enRow?.[c.field] === c.value,
      `${String(original).slice(0, 24)} → ${enRow?.[c.field]}`
    )

    const ko = await api(c.list, { locale: "ko-KR" })
    const koRow = (ko.body?.[c.key] ?? []).find((x) => x.id === row.id)
    check(
      `   └ ${c.label} 한국어는 원문 유지`,
      koRow?.[c.field] === original,
      `${String(koRow?.[c.field]).slice(0, 30)}`
    )
    idx++
  }
}

// ── 5. 번역 삭제 → 원문 복귀 ───────────────────────────────────────────────
// 운영자가 번역을 지웠을 때 화면이 비면 안 된다.
{
  if (product && created.length) {
    const target = created[0]
    const base = product.title
    await api("/admin/translations/batch", {
      method: "POST",
      admin: true,
      body: { delete: [target] },
    })
    created.splice(created.indexOf(target), 1)

    const en = await api(`/store/products/${product.id}?fields=id,title`, { locale: "en-US" })
    check(
      "⑭ 번역을 지우면 원문으로 돌아온다 (빈 화면 방지)",
      en.body?.product?.title === base,
      `title=${en.body?.product?.title}`
    )
  }
}

// ── 6. 빈 번역이 원문을 덮지 않는다 ────────────────────────────────────────
{
  if (product) {
    await putTranslation("product", product.id, "en-US", { title: "   " })
    const en = await api(`/store/products/${product.id}?fields=id,title`, { locale: "en-US" })
    const t = en.body?.product?.title
    check(
      "⑮ 공백만 있는 번역이 원문을 지우지 않는다",
      !!t && t.trim().length > 0,
      `title=${JSON.stringify(t)}`
    )
  }
}

// ── 정리 ───────────────────────────────────────────────────────────────────
await cleanup()
{
  const left = await api("/admin/translations?limit=50", { admin: true })
  check(
    "⑯ 프로브가 만든 번역을 모두 정리했다",
    (left.body?.count ?? 0) === 0,
    `남은 번역 ${left.body?.count ?? "?"}건`
  )
}

const failed = results.filter((r) => !r.pass)
console.log(`\n${"─".repeat(70)}`)
console.log(`${results.length - failed.length}/${results.length} 통과`)
if (failed.length) {
  console.log("\n실패:")
  for (const f of failed) console.log(`  · ${f.name} — ${f.detail}`)
}
process.exit(failed.length ? 1 : 0)
