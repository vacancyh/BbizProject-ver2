#!/usr/bin/env node
/**
 * 통합테스트 러너 — 도메인별 suite 를 각각 독립 실행하고 집계 리포트를 생성한다.
 *
 * 전체 실행:      BASE=http://localhost:9009 PUBKEY=pk_xxx node run-all.mjs
 * 특정 도메인만:  node run-all.mjs 05-admin 07-search      (파일명 접두 매칭)
 *
 * 한 suite 가 예외로 죽어도 다른 suite 는 계속 실행된다(격리). 산출물: REPORT.md · results.json.
 * 종료코드: 실패 케이스가 있으면 1.
 */
import { readdirSync } from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import { dirname, join } from "node:path"
import { makeCtx } from "./lib/harness.mjs"

const HERE = dirname(fileURLToPath(import.meta.url))
const filters = process.argv.slice(2)

const files = readdirSync(join(HERE, "suites"))
  .filter((f) => f.endsWith(".mjs"))
  .filter((f) => filters.length === 0 || filters.some((x) => f.startsWith(x) || f.includes(x)))
  .sort()

const ctx = makeCtx()
console.log(`\n== 통합테스트(분할·다중방법) ==  BASE=${ctx.BASE}  suites=${files.length}${filters.length ? " (필터: " + filters.join(",") + ")" : ""}\n`)

// 부트스트랩(로그인·대표자원) — 실패해도 각 suite 가 자체 처리
try { await ctx.bootstrap() } catch (e) { console.error("bootstrap 경고:", e?.message) }

for (const f of files) {
  const mod = await import(pathToFileURL(join(HERE, "suites", f)).href)
  const area = mod.meta?.area || f
  ctx.setArea(area)
  console.log(`\n──── ${f}  (${area}) ────`)
  try {
    await mod.default(ctx)
  } catch (e) {
    ctx.rec(`${f}-EX`, "스위트 실행 예외", "-", "-", "정상완료", { status: 0, err: e?.message }, false, e?.message || String(e))
  }
}

const { total, passed, failed } = ctx.writeReports(HERE)
console.log(`\n==== 결과: ${passed}/${total} PASS, ${failed} FAIL ====`)
console.log(`리포트: REPORT.md · results.json`)
process.exit(failed > 0 ? 1 : 0)
