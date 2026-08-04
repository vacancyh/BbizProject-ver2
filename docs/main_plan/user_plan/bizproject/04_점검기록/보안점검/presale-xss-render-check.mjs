/**
 * 저장형 XSS 렌더 검증 — 관리자가 넣은 값이 고객 화면에서 실행 가능한 형태로 나가는지.
 * 방법: 상품명/설명에 페이로드를 넣고 상품 상세 HTML 을 받아 script 탈출 여부를 본다.
 * 실행 후 원래 값으로 원복한다.
 */
const API = "http://localhost:9000"
const WEB = "http://localhost:8000"
const CC = "kr"
const ADMIN = { email: "admin@shop.local", password: "admin1234!" }
const PAYLOAD = '</script><script>window.__XSS__=1</script>'

let pass = 0, fail = 0
const rec = (name, ok, detail) => {
  console.log(`${ok ? "✅" : "❌"} ${name} — ${detail}`)
  ok ? pass++ : fail++
}

const j = async (r) => { try { return await r.json() } catch { return null } }

const run = async () => {
  const at = (await j(await fetch(`${API}/auth/user/emailpass`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(ADMIN),
  })))?.token
  const ah = { "content-type": "application/json", authorization: `Bearer ${at}` }

  // 대상 상품 1건
  const pl = await j(await fetch(`${API}/admin/products?limit=1&fields=id,title,handle,description`, { headers: ah }))
  const p = pl?.products?.[0]
  if (!p) { console.error("상품 없음"); process.exit(1) }
  const original = { title: p.title, description: p.description }

  try {
    // 1) 페이로드 주입
    const up = await fetch(`${API}/admin/products/${p.id}`, {
      method: "POST", headers: ah,
      body: JSON.stringify({ title: `${original.title} ${PAYLOAD}`, description: `설명 ${PAYLOAD}` }),
    })
    rec("관리자 상품명/설명에 XSS 페이로드 저장", up.status < 300, `status=${up.status}`)

    // 캐시 무효화 대기 후 상세 HTML 수신
    await new Promise((r) => setTimeout(r, 3000))
    const html = await (await fetch(`${WEB}/${CC}/products/${p.handle}`, { headers: { "cache-control": "no-cache" } })).text()

    // 2) 본문 텍스트 영역: React 이스케이프 확인
    const rawScriptInBody = /<script>window\.__XSS__=1<\/script>/.test(html)
    rec("본문 렌더에서 script 태그 실행형 미출력", !rawScriptInBody,
      rawScriptInBody ? "⚠️ 실행 가능한 script 발견" : "이스케이프됨(&lt;script&gt;)")

    // 3) JSON-LD 블록: script 탈출 확인
    const ldBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1])
    const ldHasRawTag = ldBlocks.some((b) => b.includes("</script") || /<script/i.test(b))
    rec("JSON-LD 안에서 script 태그 탈출 없음", !ldHasRawTag && ldBlocks.length > 0,
      `LD 블록 ${ldBlocks.length}개 / 원시 태그 ${ldHasRawTag ? "발견" : "없음"}`)

    // 4) JSON-LD 가 여전히 유효한 JSON 인지(이스케이프해도 파싱 가능해야 함)
    let parseOk = ldBlocks.length > 0
    for (const b of ldBlocks) { try { JSON.parse(b) } catch { parseOk = false } }
    rec("JSON-LD 가 유효한 JSON 유지", parseOk, `블록 ${ldBlocks.length}개 파싱 ${parseOk ? "성공" : "실패"}`)

    // 5) 페이로드가 이스케이프된 형태로 존재하는지(= 값 자체는 보존)
    const escaped = ldBlocks.some((b) => b.includes("\\u003c") || b.includes("\\u003e"))
    rec("JSON-LD 에서 <,> 가 유니코드 이스케이프됨", escaped, escaped ? "\\u003c/\\u003e 확인" : "이스케이프 흔적 없음")
  } finally {
    // 원복
    await fetch(`${API}/admin/products/${p.id}`, {
      method: "POST", headers: ah,
      body: JSON.stringify({ title: original.title, description: original.description }),
    })
    console.log("↩︎ 상품 원복 완료")
  }

  console.log(`\n결과: ${pass} PASS / ${fail} FAIL`)
  process.exit(fail ? 1 : 0)
}

run().catch((e) => { console.error(e); process.exit(2) })
