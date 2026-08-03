/**
 * 고객 화면 준비상태 점검 (2026-08-03 신설)
 *
 * preflight-check.ts 는 백엔드(DB·환경변수)만 본다. 하지만 **고객이 실제로 보는 것**은
 * 렌더링된 화면이다. 실제로 이런 것들이 그대로 노출된 채 방치돼 있었다:
 *   - 이용약관 본문에 "[운영사명]" 자리표시자
 *   - 고객센터 전화번호가 예시값 "1600-0000"
 *   - 상품 주소가 "/products/kr-test-p1"
 *
 * 이 스크립트는 실제 페이지를 받아서 **자리표시자·테스트 흔적이 보이는지** 확인한다.
 * 사람이 매번 눈으로 훑는 대신 기계가 본다.
 *
 * 실행: STOREFRONT=http://localhost:8000 node storefront-readiness-probe.mjs
 * 종료코드: 노출 항목이 있으면 1
 */
const BASE = process.env.STOREFRONT || "http://localhost:8000"
const CC = process.env.COUNTRY || "kr"

/** 고객에게 보이면 안 되는 흔적 — 이름과 패턴, 무엇을 해야 하는지 */
const PATTERNS = [
  {
    name: "약관 자리표시자",
    re: /\[운영사명\]|\[회사명\]|\[상호\]/g,
    action: "관리자 > 설정 > 약관에서 실제 상호로 교체",
  },
  {
    name: "예시 연락처",
    re: /1600-0000|000-0000-0000/g,
    action: "스토어프론트 .env 의 NEXT_PUBLIC_CS_PHONE 을 실제 번호로",
  },
  {
    name: "예시 사업자번호",
    re: /000-00-00000/g,
    action: "NEXT_PUBLIC_BIZ_REG_NO 를 실제 번호로",
  },
  {
    name: "예시 이메일",
    re: /[\w.+-]+@example\.com/g,
    action: "NEXT_PUBLIC_CS_EMAIL / BIZ 담당자 이메일을 실제 주소로",
  },
  {
    name: "담당자 미기재",
    re: /담당자명/g,
    action: "NEXT_PUBLIC_BIZ_PRIVACY_OFFICER 를 실제 이름으로",
  },
  {
    name: "테스트 데이터 흔적",
    re: /kr-test|QA-\d|자동화 테스트/g,
    action: "cleanup-test-data.ts 실행 + 시드 상품을 실제 상품으로 교체",
  },
]

const PAGES = [
  ["홈", `/${CC}`],
  ["전체상품", `/${CC}/store`],
  ["장바구니", `/${CC}/cart`],
  ["로그인", `/${CC}/account`],
  ["고객센터", `/${CC}/customer-service`],
  ["이용약관", `/${CC}/content/terms-of-use`],
  ["개인정보처리방침", `/${CC}/content/privacy-policy`],
  ["비회원 주문조회", `/${CC}/order/lookup`],
]

/** 법정 표시 의무 항목 — 푸터에 있어야 한다(전자상거래법) */
const REQUIRED_FOOTER = ["상호", "대표", "사업자등록번호", "통신판매업"]

async function main() {
  console.log(`\n대상: ${BASE}\n`)
  const found = new Map() // 패턴명 → { pages:Set, samples:Set, action }
  let pageErrors = 0

  for (const [label, path] of PAGES) {
    let res, html
    try {
      res = await fetch(BASE + path)
      html = await res.text()
    } catch (e) {
      console.log(`❌ ${label.padEnd(18)} 접속 실패 — ${e?.message}`)
      pageErrors++
      continue
    }
    if (!res.ok) {
      console.log(`❌ ${label.padEnd(18)} http=${res.status}`)
      pageErrors++
      continue
    }

    // 입력창의 placeholder 속성은 정상적인 입력 안내다(예: placeholder="you@example.com").
    // 이걸 미완성 표기로 잡으면 오탐이 되어 도구를 못 믿게 된다 → 검사 대상에서 제외.
    const visible = html.replace(/placeholder="[^"]*"/g, "")

    const hitsHere = []
    for (const p of PATTERNS) {
      const m = visible.match(p.re)
      if (!m) continue
      const uniq = [...new Set(m)]
      hitsHere.push(`${p.name}(${uniq.slice(0, 2).join(", ")})`)
      if (!found.has(p.name)) found.set(p.name, { pages: new Set(), samples: new Set(), action: p.action })
      const rec = found.get(p.name)
      rec.pages.add(label)
      uniq.slice(0, 3).forEach((u) => rec.samples.add(u))
    }
    console.log(
      `${hitsHere.length ? "⚠️ " : "✅"} ${label.padEnd(18)} http=${res.status}` +
        (hitsHere.length ? `  ${hitsHere.join(" · ")}` : "")
    )
  }

  // 푸터 법정 표시
  console.log("\n[푸터 법정 표시 항목]")
  let footerMissing = 0
  try {
    const home = await (await fetch(`${BASE}/${CC}`)).text()
    for (const f of REQUIRED_FOOTER) {
      const ok = home.includes(f)
      if (!ok) footerMissing++
      console.log(`  ${ok ? "✅" : "❌"} ${f}`)
    }
  } catch {
    console.log("  (홈 조회 실패로 확인 불가)")
  }

  // 요약
  console.log("\n══════════════════ 요약 ══════════════════")
  if (!found.size && !footerMissing && !pageErrors) {
    console.log("✅ 고객 화면에 노출된 자리표시자·테스트 흔적이 없습니다.")
    return
  }
  if (found.size) {
    console.log(`⚠️  고객에게 보이는 미완성 표기 ${found.size}종:\n`)
    for (const [name, rec] of found) {
      console.log(`  · ${name}`)
      console.log(`      노출 화면: ${[...rec.pages].join(", ")}`)
      console.log(`      실제 값  : ${[...rec.samples].slice(0, 3).join(", ")}`)
      console.log(`      조치     : ${rec.action}`)
    }
  }
  if (footerMissing) console.log(`\n❌ 푸터 법정 표시 항목 ${footerMissing}건 누락 — 전자상거래법상 표시 의무입니다.`)
  if (pageErrors) console.log(`\n❌ 열리지 않는 화면 ${pageErrors}건`)
  console.log("═══════════════════════════════════════════")
  process.exitCode = 1
}

main().catch((e) => {
  console.error("프로브 오류:", e)
  process.exit(1)
})
