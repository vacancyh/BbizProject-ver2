/**
 * 슬라이드 데이터 → HTML 렌더러 (2026-08-04 신설)
 *
 * 내용은 slides.mjs 에만 있고, 여기는 모양만 담당한다.
 * 발표 내용을 고칠 일이 있으면 이 파일이 아니라 slides.mjs 를 열면 된다.
 */

const W = 1280
const H = 720

/** 저작 내용은 신뢰하는 HTML로 취급한다 (<b>, <code>, <span> 을 그대로 쓰기 위함) */
const br = (s) => String(s).replace(/\n/g, "<br>")

// ─────────────────────────────────────────────────────────────
// 슬라이드 공통 스타일
// ─────────────────────────────────────────────────────────────
const SLIDE_CSS = `
@page { size: ${W}px ${H}px; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  font-family: "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo", sans-serif;
  -webkit-font-smoothing: antialiased;
  color: #17181d;
}
code, .mono { font-family: "D2Coding", "Consolas", "Menlo", monospace; }

.slide {
  position: relative;
  width: ${W}px; height: ${H}px;
  padding: 62px 76px 76px;
  background: #fff;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
  display: flex; flex-direction: column;
}
.slide:last-child { page-break-after: auto; break-after: auto; }

/* 상단 얇은 강조선 */
.slide::before {
  content: ""; position: absolute; top: 0; left: 0;
  width: 100%; height: 6px; background: #3d5afe;
}

/* 하단 러너 */
.foot {
  position: absolute; left: 76px; right: 76px; bottom: 28px;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 15px; color: #9aa0ae; letter-spacing: .2px;
}
.foot .tag { color: #3d5afe; font-weight: 700; }

h1.stitle {
  font-size: 44px; font-weight: 800; letter-spacing: -1px;
  line-height: 1.25; margin-bottom: 10px;
}
.ssub { font-size: 22px; color: #6b7280; margin-bottom: 30px; font-weight: 500; }
.stitle + .body { margin-top: 26px; }
/* 내용이 적은 장은 위로 몰려 아래가 텅 비어 보인다 → 세로 중앙 정렬 */
.body {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column; justify-content: center;
  padding-bottom: 34px; /* 하단 러너와 시각적 간격 */
}

.note {
  margin-top: 26px; padding: 16px 20px;
  background: #f3f5fb; border-left: 4px solid #3d5afe;
  font-size: 19px; line-height: 1.55; color: #4a5163;
}
.note b { color: #17181d; }
.dim { color: #8b91a1; font-weight: 400; }

/* ── bullets ── */
ul.pts { list-style: none; }
ul.pts li {
  position: relative; padding-left: 42px; margin-bottom: 26px;
  font-size: 27px; line-height: 1.45;
}
ul.pts li:last-child { margin-bottom: 0; }
ul.pts li::before {
  content: ""; position: absolute; left: 6px; top: .62em;
  width: 11px; height: 11px; border-radius: 50%; background: #3d5afe;
}
ul.pts li b { font-weight: 800; }
/* 항목 수에 맞춰 크기 조정 — 적으면 크게, 많으면 작게 */
ul.pts.n3 li { font-size: 33px; margin-bottom: 34px; }
ul.pts.n4 li { font-size: 29px; margin-bottom: 28px; }
ul.pts.n5 li { font-size: 25px; margin-bottom: 20px; }
ul.pts.n6 li { font-size: 23px; margin-bottom: 16px; }

/* ── code ── */
.code {
  background: #14161c; color: #dfe3ec;
  border-radius: 10px; padding: 30px 34px;
  font-family: "D2Coding", "Consolas", monospace;
  font-size: 23px; line-height: 1.62; white-space: pre-wrap;
}
.code.sm { font-size: 20px; line-height: 1.6; }
.code.lg { font-size: 28px; line-height: 1.7; padding: 40px 38px; }
.code.danger { background: #2a1416; color: #ffd9d9; border: 1px solid #7d2b30; }
.code.plain {
  background: #f3f5fb; color: #1e2430; border: 1px solid #dde2f0;
  text-align: center; font-size: 27px; padding: 40px 30px;
}

/* ── compare ── */
.cmp { display: flex; gap: 26px; }
.cmp > div {
  flex: 1; border-radius: 10px; padding: 24px 26px;
  display: flex; flex-direction: column;
}
.cmp .bad  { background: #fdf1f1; border: 1px solid #f3cfcf; }
.cmp .good { background: #eef7f0; border: 1px solid #c9e5d1; }
/* 좋고 나쁨이 아니라 단순 대비일 때 — 색으로 판정하는 인상을 주지 않는다 */
.cmp .neutral { background: #f5f6fa; border: 1px solid #dfe3ee; }
.cmp .lbl { font-size: 19px; font-weight: 800; margin-bottom: 14px; }
.cmp .bad .lbl  { color: #b3261e; }
.cmp .good .lbl { color: #1e7a3c; }
.cmp .neutral .lbl { color: #3d5afe; }
.cmp .txt {
  font-family: "D2Coding", "Consolas", monospace;
  font-size: 19px; line-height: 1.62; white-space: pre-wrap; color: #2a2f3a;
}
.cmp.wordy .txt { font-family: inherit; font-size: 21px; line-height: 1.6; }

/* ── table ── */
table.tbl { width: 100%; border-collapse: collapse; font-size: 21px; }
table.tbl th {
  background: #eef1fa; color: #2c3550; text-align: left;
  padding: 15px 18px; font-weight: 800; border-bottom: 2px solid #ccd4ea;
}
table.tbl td {
  padding: 15px 18px; border-bottom: 1px solid #e6e9f2; line-height: 1.45;
}
/* 첫 칸이 폴더·파일명일 때만 고정폭 — 한글 라벨에 쓰면 자간이 벌어져 어색하다 */
table.tbl.code1 td:first-child { font-family: "D2Coding", "Consolas", monospace; }
table.tbl td:first-child { font-weight: 700; color: #3d5afe; white-space: nowrap; }

/* ── big ── */
.slide.big { justify-content: center; align-items: center; text-align: center; }
.slide.big .btext {
  font-size: 56px; font-weight: 800; line-height: 1.35; letter-spacing: -1.5px;
}
.slide.big .btext b { color: #3d5afe; }
.slide.big .bsub { margin-top: 30px; font-size: 25px; color: #6b7280; line-height: 1.5; }

/* ── metrics ── */
.mets { display: flex; gap: 20px; margin-top: 14px; }
.mets > div {
  flex: 1; background: #f3f5fb; border-radius: 12px;
  padding: 40px 16px; text-align: center;
}
.mets .v { font-size: 76px; font-weight: 800; color: #3d5afe; line-height: 1; letter-spacing: -2px; }
.mets .l { margin-top: 16px; font-size: 21px; color: #4a5163; font-weight: 600; }

/* ── journey: 단계별 진행 개요 ── */
.jn { display: flex; gap: 16px; align-items: stretch; }
.jn > div {
  flex: 1; position: relative;
  background: #f5f6fa; border: 1px solid #dfe3ee; border-radius: 10px;
  padding: 22px 20px 20px;
}
/* 단계 사이 화살표 */
.jn > div + div::before {
  content: "→"; position: absolute; left: -21px; top: 50%;
  transform: translateY(-50%); color: #c2c8d8; font-size: 22px;
}
.jn .n {
  display: inline-block; margin-bottom: 12px; padding: 3px 11px;
  background: #3d5afe; color: #fff; border-radius: 20px;
  font-size: 15px; font-weight: 800; letter-spacing: .3px;
}
.jn .t { font-size: 24px; font-weight: 800; line-height: 1.3; margin-bottom: 12px; }
.jn .r {
  font-size: 17px; line-height: 1.5; color: #6b7280;
  padding-top: 12px; border-top: 1px dashed #d5dae8;
}
/* 마지막 단계만 강조 — 지금 쓰는 방식 */
.jn > div:last-child { background: #eef1fa; border-color: #b9c4ea; }

/* ── 표지 / 섹션 표지 ── */
.slide.cover, .slide.sect {
  background: #14161c; color: #fff;
  justify-content: center;
}
.slide.cover::before, .slide.sect::before { background: #3d5afe; }
.slide.cover .ctitle {
  font-size: 68px; font-weight: 800; letter-spacing: -2px; line-height: 1.2;
}
.slide.cover .csub { margin-top: 24px; font-size: 30px; color: #9aa0ae; }
.slide.cover .cmeta {
  margin-top: 60px; padding-top: 28px; border-top: 1px solid #333842;
  font-size: 20px; color: #7c8494; line-height: 1.9;
}
.slide.sect .snum {
  font-size: 21px; font-weight: 800; color: #3d5afe; letter-spacing: 2px;
  margin-bottom: 18px;
}
.slide.sect .stt { font-size: 54px; font-weight: 800; letter-spacing: -1.5px; line-height: 1.25; }
.slide.sect .sss { margin-top: 20px; font-size: 26px; color: #9aa0ae; }
.slide.sect .stime { margin-top: 44px; font-size: 19px; color: #6b7280; }
.slide.cover .foot, .slide.sect .foot { color: #5a6172; }
.slide.cover .foot .tag, .slide.sect .foot .tag { color: #3d5afe; }
`

// ─────────────────────────────────────────────────────────────
// 슬라이드 1장 렌더링
// ─────────────────────────────────────────────────────────────
function foot(left, right) {
  return `<div class="foot"><span class="tag">${left}</span><span>${right}</span></div>`
}

function head(s) {
  const sub = s.subtitle ? `<div class="ssub">${br(s.subtitle)}</div>` : ""
  return `<h1 class="stitle">${br(s.title)}</h1>${sub}`
}

function note(s) {
  return s.note ? `<div class="note">${br(s.note)}</div>` : ""
}

function renderSlide(s, ctx) {
  const f = foot(ctx.tag, ctx.page)

  switch (s.type) {
    case "cover":
      return `<section class="slide cover">
        <div class="ctitle">${br(s.title)}</div>
        <div class="csub">${br(s.subtitle)}</div>
        <div class="cmeta">${br(s.meta)}</div>${f}
      </section>`

    case "sect":
      return `<section class="slide sect">
        <div class="snum">${s.num}</div>
        <div class="stt">${br(s.title)}</div>
        <div class="sss">${br(s.subtitle)}</div>
        <div class="stime">${s.time}</div>${f}
      </section>`

    case "big":
      return `<section class="slide big">
        <div class="btext">${br(s.text)}</div>
        ${s.sub ? `<div class="bsub">${br(s.sub)}</div>` : ""}${f}
      </section>`

    case "metrics":
      return `<section class="slide">${head(s)}
        <div class="body"><div class="mets">${s.items
          .map((i) => `<div><div class="v">${i.value}</div><div class="l">${i.label}</div></div>`)
          .join("")}</div>${note(s)}</div>${f}
      </section>`

    case "bullets": {
      const n = ` n${Math.min(6, Math.max(3, s.items.length + (s.note ? 1 : 0)))}`
      return `<section class="slide">${head(s)}
        <div class="body"><ul class="pts${n}">${s.items
          .map((i) => `<li>${br(i)}</li>`)
          .join("")}</ul>${note(s)}</div>${f}
      </section>`
    }

    case "code": {
      const len = s.body.length
      // size 로 자동 판정을 덮어쓸 수 있다 — 줄 수가 많아 아슬아슬한 장에 쓴다
      const auto = len > 420 ? "sm" : len < 190 ? "lg" : ""
      const cls = ["code", s.size || auto, s.danger ? "danger" : "", s.plain ? "plain" : ""]
        .filter(Boolean)
        .join(" ")
      return `<section class="slide">${head(s)}
        <div class="body"><div class="${cls}">${br(s.body)}</div>${note(s)}</div>${f}
      </section>`
    }

    case "compare": {
      const wordy = s.left.body.length > 90 || s.right.body.length > 90 ? "" : " wordy"
      // tone 을 안 주면 좌=나쁨/우=좋음. 단순 대비면 각 면에 tone:"neutral" 을 준다.
      const side = (d, fallback) =>
        `<div class="${d.tone || fallback}"><div class="lbl">${br(d.label)}</div><div class="txt">${br(d.body)}</div></div>`
      return `<section class="slide">${head(s)}
        <div class="body"><div class="cmp${wordy}">
          ${side(s.left, "bad")}${side(s.right, "good")}
        </div>${note(s)}</div>${f}
      </section>`
    }

    case "journey":
      return `<section class="slide">${head(s)}
        <div class="body"><div class="jn">${s.items
          .map(
            (i) =>
              `<div><div class="n">${i.n}</div><div class="t">${br(i.t)}</div><div class="r">${br(i.r)}</div></div>`
          )
          .join("")}</div>${note(s)}</div>${f}
      </section>`

    case "table":
      return `<section class="slide">${head(s)}
        <div class="body"><table class="tbl${s.code1 ? " code1" : ""}">
          <thead><tr>${s.head.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
          <tbody>${s.rows
            .map((r) => `<tr>${r.map((c) => `<td>${br(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody>
        </table>${note(s)}</div>${f}
      </section>`

    default:
      throw new Error(`알 수 없는 슬라이드 타입: ${s.type}`)
  }
}

/**
 * 슬라이드 덱 HTML 생성
 * @param sections 렌더할 섹션 배열
 * @param opts.cover 표지 슬라이드 (없으면 생략)
 * @param opts.withSectionDividers 섹션 표지 삽입 여부
 */
export function buildDeck(sections, opts = {}) {
  const out = []
  let page = 0
  const total =
    (opts.cover ? 1 : 0) +
    sections.reduce((n, s) => n + s.slides.length + (opts.withSectionDividers ? 1 : 0), 0)

  const push = (s, tag) => {
    page++
    out.push(renderSlide(s, { tag, page: `${page} / ${total}` }))
  }

  if (opts.cover) push({ type: "cover", ...opts.cover }, opts.coverTag || "")

  for (const sec of sections) {
    const tag = `${sec.presenter} · ${sec.title}`
    if (opts.withSectionDividers) {
      push(
        {
          type: "sect",
          num: `PART ${sec.id}`,
          title: sec.title,
          subtitle: sec.subtitle,
          time: `${sec.presenter} · ${sec.minutes}분`,
        },
        tag
      )
    }
    for (const sl of sec.slides) push(sl, tag)
  }

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${opts.title || "발표 슬라이드"}</title><style>${SLIDE_CSS}</style></head>
<body>${out.join("\n")}</body></html>`
}

// ─────────────────────────────────────────────────────────────
// 대본 (A4 세로)
// ─────────────────────────────────────────────────────────────
const SCRIPT_CSS = `
@page { size: A4; margin: 18mm 16mm 16mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: "Malgun Gothic", "맑은 고딕", sans-serif;
  font-size: 10.5pt; line-height: 1.6; color: #17181d;
}
.docttl { font-size: 22pt; font-weight: 800; letter-spacing: -.5pt; }
.docsub { margin-top: 6pt; font-size: 11pt; color: #6b7280; }
.docmeta {
  margin: 14pt 0 24pt; padding: 10pt 12pt;
  background: #f3f5fb; border-left: 3pt solid #3d5afe;
  font-size: 9.5pt; color: #4a5163; line-height: 1.7;
}
h2.part {
  margin-top: 22pt; margin-bottom: 10pt; padding-bottom: 6pt;
  border-bottom: 2pt solid #14161c;
  font-size: 15pt; font-weight: 800; letter-spacing: -.4pt;
  page-break-after: avoid; break-after: avoid;
}
h2.part .who { font-size: 10pt; color: #3d5afe; font-weight: 700; }
h2.part:first-of-type { margin-top: 0; }
table.sc { width: 100%; border-collapse: collapse; margin-bottom: 6pt; }
table.sc th {
  background: #eef1fa; color: #2c3550; font-size: 9pt; font-weight: 800;
  text-align: left; padding: 7pt 8pt; border-bottom: 1.5pt solid #ccd4ea;
}
table.sc td {
  padding: 8pt; border-bottom: .75pt solid #e6e9f2;
  vertical-align: top; page-break-inside: avoid; break-inside: avoid;
}
table.sc td.n { width: 26pt; color: #9aa0ae; font-weight: 700; text-align: center; }
table.sc td.s { width: 112pt; font-weight: 700; color: #2c3550; }
table.sc td.t { width: 44pt; color: #3d5afe; font-weight: 700; white-space: nowrap; }
tr.pb { page-break-before: always; break-before: page; }
.tips {
  margin-top: 12pt; padding: 10pt 12pt;
  border: .75pt solid #e6e9f2; border-radius: 4pt; background: #fbfcfe;
  font-size: 9.5pt; color: #4a5163;
}
.tips b { color: #17181d; }
.tips ul { margin: 5pt 0 0 14pt; }
.tips li { margin-bottom: 3pt; }
.linkbox { margin-top: 10pt; font-size: 9pt; color: #8b91a1; }
`

export function buildScriptDoc(sections, script, meta) {
  const parts = sections
    .map((sec) => {
      const rows = (script[sec.id] || [])
        .map(
          ([slide, time, say], i) =>
            `<tr><td class="n">${i + 1}</td><td class="s">${slide}</td><td class="t">${time}</td><td>${say}</td></tr>`
        )
        .join("")
      const tips = (sec.tips || [])
        .map((t) => `<li>${t}</li>`)
        .join("")
      return `<h2 class="part">${sec.title}
        <span class="who">— ${sec.presenter} · ${sec.minutes}분</span></h2>
        <table class="sc">
          <thead><tr><th></th><th>슬라이드</th><th>시간</th><th>말할 내용</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${tips ? `<div class="tips"><b>발표 팁</b><ul>${tips}</ul></div>` : ""}`
    })
    .join("\n")

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${meta.title}</title><style>${SCRIPT_CSS}</style></head><body>
<div class="docttl">${meta.title}</div>
<div class="docsub">${meta.subtitle}</div>
<div class="docmeta">${br(meta.meta)}</div>
${parts}
</body></html>`
}
