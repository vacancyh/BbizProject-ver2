// 판매 개시 전 준비상태 자동 점검 (2026-08-03 신설)
//
// 목적: "지금 이 쇼핑몰을 열어도 되는가?" 를 명령 하나로 판정한다.
//
// 배경: 준비 여부가 문서 여러 곳에 흩어져 있어 사람이 일일이 대조해야 했다.
//       실제로 QA 테스트 약관이 고객 화면의 이용약관 자리를 차지한 채 방치돼 있었고
//       (2026-08-03 발견), 아무도 몰랐다. 사람이 놓치는 것은 기계가 봐야 한다.
//
// 실행:
//   npx medusa exec ./src/scripts/preflight-check.ts
//
// 판정:
//   BLOCK  = 이 상태로 열면 안 된다(법적/금전/장애 위험)
//   WARN   = 열 수는 있지만 곧 문제가 된다
//   OK     = 확인됨
//
// 종료코드: BLOCK 이 하나라도 있으면 1 (CI 게이트로 쓸 수 있다)
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LEGAL_DOC_MODULE } from "../modules/legal-kr/legal-doc"
import { POLICY_MODULE } from "../modules/policy"

type Level = "BLOCK" | "WARN" | "OK"
type Row = { level: Level; area: string; title: string; detail: string; action?: string }

const rows: Row[] = []
function add(level: Level, area: string, title: string, detail: string, action?: string) {
  rows.push({ level, area, title, detail, action })
}

/** 값이 "아직 안 채운 자리표시자" 인지 판정 */
const PLACEHOLDER = /\[.*?\]|CHANGE_ME|example\.com|TODO|테스트|QA-\d|placeholder|담당자명|1600-0000|000-00-00000/i

/** 개발용으로 알려진 위험한 기본값 */
const KNOWN_DEV_SECRETS = [
  "supersecret",
  "CHANGE_ME",
  "dev-insecure",
  "admin1234!",
  "supersecret-revalidate",
]

export default async function preflightCheck({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // ═══ 1. 법정 문서 ════════════════════════════════════════════════════════
  try {
    const legal = container.resolve(LEGAL_DOC_MODULE) as any
    const docs: any[] = await legal.listLegalDocs({})
    const published = docs.filter((d) => d.status === "published")
    const required = [
      { type: "terms_of_service", label: "이용약관" },
      { type: "privacy_policy", label: "개인정보처리방침" },
    ]
    for (const r of required) {
      const mine = published
        .filter((d) => d.type === r.type)
        .sort((a, b) => (String(a.effective_at) < String(b.effective_at) ? 1 : -1))
      const cur = mine[0]
      if (!cur) {
        add("BLOCK", "법정문서", r.label, "게시된 문서가 없습니다.", "관리자 > 설정 > 약관에서 작성 후 게시")
      } else if (PLACEHOLDER.test(String(cur.body))) {
        add(
          "BLOCK",
          "법정문서",
          r.label,
          `자리표시자/테스트 문구가 남아 있습니다 (ver=${cur.version}, ${String(cur.body).length}자)`,
          "실제 본문으로 교체 — 전자상거래법상 필수 게시 항목"
        )
      } else if (String(cur.body).length < 500) {
        add("WARN", "법정문서", r.label, `본문이 ${String(cur.body).length}자로 짧습니다(ver=${cur.version}).`, "법무 검토 권장")
      } else {
        add("OK", "법정문서", r.label, `ver=${cur.version} · ${String(cur.body).length}자`)
      }
    }
    // 동의 문서(마케팅/제3자)는 수집 시 필수
    for (const t of [
      { type: "marketing_consent", label: "마케팅 수신동의" },
      { type: "third_party_consent", label: "제3자 제공동의" },
    ]) {
      const has = published.some((d) => d.type === t.type)
      if (!has) {
        add("WARN", "법정문서", t.label, "게시본이 없습니다(draft 만 존재하거나 미작성).", "해당 정보를 수집·활용한다면 필수")
      } else {
        add("OK", "법정문서", t.label, "게시됨")
      }
    }
  } catch (e) {
    add("WARN", "법정문서", "조회 실패", String((e as Error)?.message).slice(0, 80))
  }

  // ═══ 2. 사업자 정보(스토어프론트 푸터·약관 표기) ═════════════════════════
  const bizKeys = [
    { key: "NEXT_PUBLIC_BIZ_NAME", label: "상호" },
    { key: "NEXT_PUBLIC_BIZ_CEO", label: "대표자" },
    { key: "NEXT_PUBLIC_BIZ_REG_NO", label: "사업자등록번호" },
    { key: "NEXT_PUBLIC_BIZ_MAIL_ORDER_NO", label: "통신판매업 신고번호" },
    { key: "NEXT_PUBLIC_BIZ_ADDRESS", label: "사업장 주소" },
    { key: "NEXT_PUBLIC_BIZ_PRIVACY_OFFICER", label: "개인정보보호책임자" },
  ]
  // 백엔드 프로세스에는 스토어프론트 env 가 없다 — 안내만 한다.
  add(
    "WARN",
    "사업자정보",
    "푸터 표기 6종",
    `스토어프론트 .env 에서 설정합니다: ${bizKeys.map((b) => b.label).join(" · ")}`,
    "전자상거래법상 표시 의무. 통신판매업 신고는 관할 구청에 직접 신청해야 합니다."
  )

  // ═══ 3. 시크릿·운영 설정 ═════════════════════════════════════════════════
  const isProd = process.env.NODE_ENV === "production"
  const secretChecks = [
    { key: "JWT_SECRET", label: "JWT 서명키" },
    { key: "COOKIE_SECRET", label: "쿠키 서명키" },
    { key: "REVALIDATE_SECRET", label: "캐시 무효화 토큰" },
    { key: "PII_ENCRYPTION_KEY", label: "PII 암호화키" },
    { key: "ADMIN_2FA_SECRET_KEY", label: "2FA 암호화키" },
  ]
  for (const s of secretChecks) {
    const v = process.env[s.key]
    if (!v) {
      add(isProd ? "BLOCK" : "WARN", "시크릿", s.label, `${s.key} 미설정`, "운영 배포 전 무작위 값으로 발급")
    } else if (KNOWN_DEV_SECRETS.some((d) => v.includes(d))) {
      add("BLOCK", "시크릿", s.label, `${s.key} 가 개발용 기본값입니다.`, "openssl rand -base64 48 로 교체")
    } else {
      add("OK", "시크릿", s.label, "설정됨")
    }
  }

  // 분산 락 — 이번 점검(2026-08-03)에서 고친 금전 결함 3건의 전제 조건
  const lockRedis = process.env.LOCKING_REDIS_URL || process.env.REDIS_URL
  if (!lockRedis) {
    add(
      "BLOCK",
      "인프라",
      "분산 락 저장소",
      "LOCKING_REDIS_URL / REDIS_URL 둘 다 없습니다 → 락이 in-memory 로 동작합니다.",
      "API 를 2대 이상 띄우면 적립금 이중사용·환불 이중집행이 재발합니다(실측 확인된 결함)"
    )
  } else {
    add("OK", "인프라", "분산 락 저장소", "Redis 설정됨")
  }

  if (isProd && process.env.COOKIE_SECURE !== "true") {
    add("BLOCK", "인프라", "쿠키 Secure 플래그", "COOKIE_SECURE 가 true 가 아닙니다.", "HTTPS 환경에서는 필수")
  }

  // 보안 강화 플래그 — 운영에서는 켜는 것을 권장
  const hardening = [
    { key: "SECURITY_GUARD_FAIL_CLOSED", label: "가드 오류 시 차단" },
    { key: "ADMIN_2FA_REQUIRED", label: "관리자 2FA 필수" },
    { key: "ADMIN_MONEY_ACTIONS_SUPER_ONLY", label: "환불·취소 super 전용" },
  ]
  const off = hardening.filter((h) => process.env[h.key] !== "true")
  if (!off.length) {
    add("OK", "보안설정", "강화 플래그", "3/3 활성")
  } else if (isProd) {
    add(
      "WARN",
      "보안설정",
      "강화 플래그",
      `운영인데 ${off.length}/3 꺼짐: ${off.map((o) => o.label).join(", ")}`,
      "운영에서는 3개 모두 true 권장"
    )
  } else {
    add(
      "OK",
      "보안설정",
      "강화 플래그",
      `개발 환경이라 ${off.length}/3 꺼짐(정상) — 운영 배포 시 3개 모두 켤 것`
    )
  }

  // ═══ 4. 판매 준비 — 상품·재고·배송·결제 ═════════════════════════════════
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "status", "thumbnail"],
  })
  const all = products ?? []
  const live = all.filter((p: any) => p.status === "published")
  const testish = all.filter((p: any) => /kr-test|qa|test|샘플/i.test(String(p.handle ?? "")))
  const noImage = live.filter((p: any) => !p.thumbnail)

  if (live.length === 0) {
    add("BLOCK", "상품", "판매 가능 상품", "게시된 상품이 0건입니다.", "상품을 등록하고 게시하세요")
  } else {
    add("OK", "상품", "판매 가능 상품", `${live.length}건 게시됨(전체 ${all.length})`)
  }
  if (testish.length) {
    add(
      "BLOCK",
      "상품",
      "테스트 상품 잔존",
      `${testish.length}건 — 주소가 /products/${testish[0]?.handle} 형태로 고객에게 보입니다.`,
      "실제 상품으로 교체하거나 비공개 처리"
    )
  }
  if (noImage.length) {
    add("WARN", "상품", "대표 이미지 없음", `${noImage.length}건`, "이미지 없는 상품은 구매전환이 크게 떨어집니다")
  }

  // 이미지 호스트 — 스토어프론트 next.config.js 의 remotePatterns 에 없으면
  // 이미지 최적화가 켜진 상태에서 **해당 상품 페이지가 500 을 낸다**(2026-08-03 실측).
  try {
    const { data: images } = await query.graph({ entity: "product", fields: ["thumbnail", "images.url"] })
    const hosts = new Set<string>()
    for (const p of (images ?? []) as any[]) {
      const urls = [p.thumbnail, ...((p.images ?? []).map((i: any) => i.url))].filter(Boolean)
      for (const u of urls) {
        const m = /^https?:\/\/([^/]+)/.exec(String(u))
        if (m) hosts.add(m[1])
      }
    }
    // 스토어프론트에 등록된 호스트 목록(수기 동기화 — 자동 참조가 불가능한 별도 앱이라)
    const ALLOWED = [
      "picsum.photos",
      "fastly.picsum.photos",
      "images.unsplash.com",
      "images.pexels.com",
      "medusa-public-images.s3.eu-west-1.amazonaws.com",
      "localhost",
    ]
    const unknown = [...hosts].filter(
      (h) => !ALLOWED.some((a) => h === a || h.endsWith(`.${a}`) || /\.s3[.-].*amazonaws\.com$/.test(h))
    )
    if (unknown.length) {
      add(
        "BLOCK",
        "이미지",
        "미등록 호스트",
        `${unknown.length}종: ${unknown.slice(0, 3).join(", ")}`,
        "apps/web/next.config.js 의 images.remotePatterns 에 추가하세요 — 없으면 해당 상품 페이지가 500 입니다"
      )
    } else {
      add("OK", "이미지", "호스트 등록", `${hosts.size}종 전부 등록됨`)
    }
  } catch {
    add("WARN", "이미지", "호스트 확인 실패", "product 이미지 조회 불가")
  }

  // 재고
  try {
    const { data: levels } = await query.graph({
      entity: "inventory_level",
      fields: ["id", "stocked_quantity", "reserved_quantity"],
    })
    const neg = (levels ?? []).filter(
      (l: any) => Number(l.stocked_quantity) - Number(l.reserved_quantity) < 0
    )
    const zero = (levels ?? []).filter(
      (l: any) => Number(l.stocked_quantity) - Number(l.reserved_quantity) <= 0
    )
    if (neg.length) {
      add("BLOCK", "재고", "가용재고 음수", `${neg.length}건 — 오버셀이 발생했습니다.`, "재고 실사 후 보정")
    } else {
      add("OK", "재고", "가용재고 음수", "0건")
    }
    if (zero.length) {
      add("WARN", "재고", "품절", `${zero.length}건이 가용재고 0 이하입니다.`, "판매 개시 전 입고 확인")
    }
  } catch {
    add("WARN", "재고", "조회 실패", "inventory_level 조회 불가")
  }

  // 배송 옵션
  try {
    const { data: so } = await query.graph({ entity: "shipping_option", fields: ["id", "name"] })
    if (!so || so.length === 0) {
      add("BLOCK", "배송", "배송 방법", "등록된 배송 옵션이 없습니다 → 주문을 완료할 수 없습니다.")
    } else {
      add("OK", "배송", "배송 방법", `${so.length}건 등록`)
    }
  } catch {
    add("WARN", "배송", "조회 실패", "shipping_option 조회 불가")
  }

  // 결제 — 실 PG 연동 여부
  try {
    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id", "name", "currency_code", "payment_providers.id"],
    })
    const provs = new Set<string>()
    for (const r of regions ?? []) {
      for (const p of (r as any).payment_providers ?? []) provs.add(String(p.id))
    }
    const onlyManual = [...provs].every((p) => /manual|system|default/i.test(p))
    if (provs.size === 0) {
      add("BLOCK", "결제", "결제 수단", "등록된 결제 provider 가 없습니다.")
    } else if (onlyManual) {
      add(
        "BLOCK",
        "결제",
        "실 PG 미연동",
        `현재 수단: ${[...provs].join(", ")} — 수동/시스템 provider 뿐입니다.`,
        "실제 결제를 받으려면 PG 계약·연동이 필요합니다(비용 발생)"
      )
    } else {
      add("OK", "결제", "결제 수단", [...provs].join(", "))
    }
  } catch {
    add("WARN", "결제", "조회 실패", "region/payment_provider 조회 불가")
  }

  // ═══ 5. 정책 임시값 ══════════════════════════════════════════════════════
  try {
    const policy = container.resolve(POLICY_MODULE) as any
    const keys = [
      { k: "shipping.base_fee", label: "기본 배송비" },
      { k: "shipping.free_threshold", label: "무료배송 기준금액" },
      { k: "point.earn_rate", label: "적립률" },
      { k: "point.expire_months", label: "적립금 유효기간" },
      { k: "membership.tiers", label: "회원등급 기준" },
    ]
    const missing: string[] = []
    for (const k of keys) {
      const row = await policy.get(k.k).catch(() => null)
      if (!row || row.value === null || row.value === undefined) missing.push(k.label)
    }
    if (missing.length) {
      add(
        "WARN",
        "정책값",
        "미확정 항목",
        `${missing.length}건: ${missing.join(", ")}`,
        "정해지지 않아 코드 기본값으로 동작 중입니다"
      )
    } else {
      add("OK", "정책값", "주요 정책", "설정됨")
    }
  } catch {
    add("WARN", "정책값", "조회 실패", "policy 모듈 조회 불가")
  }

  // ═══ 6. 테스트 데이터 잔재 ═══════════════════════════════════════════════
  try {
    const { data: customers } = await query.graph({ entity: "customer", fields: ["id", "email"] })
    const testCust = (customers ?? []).filter((c: any) =>
      /@kr-(audit|e2e|itest|smoke|verify|test)\.local$/.test(String(c.email ?? ""))
    )
    if (testCust.length) {
      add(
        "WARN",
        "테스트데이터",
        "자동화 계정",
        `${testCust.length}건 — 회원 통계·매출 집계가 왜곡됩니다.`,
        "운영 이관 시 별도 판단(주문·적립금이 얽혀 있어 자동 삭제하지 않음)"
      )
    } else {
      add("OK", "테스트데이터", "자동화 계정", "0건")
    }

    const { data: cats } = await query.graph({ entity: "product_category", fields: ["id", "name", "handle"] })
    const badCat = (cats ?? []).filter(
      (c: any) => /kr-test|qa/i.test(String(c.name)) || /[^ -~]/.test(String(c.handle ?? ""))
    )
    if (badCat.length) {
      add("BLOCK", "테스트데이터", "카테고리", `${badCat.length}건이 테스트 표기이거나 비-ASCII 주소입니다.`,
        "CLEANUP_RENAME_TEST_CATEGORIES=true 로 cleanup-test-data.ts 실행")
    } else {
      add("OK", "테스트데이터", "카테고리", "정상")
    }
  } catch {
    add("WARN", "테스트데이터", "조회 실패", "customer/category 조회 불가")
  }

  // ═══ 6-1. 데모 소셜 로그인 계정 ══════════════════════════════════════════
  // 실측(2026-08-03): "카카오로 시작하기" 를 누른 **모든 방문자가 같은 데모 계정**으로
  // 로그인됐다. 운영에 나가면 다른 고객의 주문내역·배송지가 그대로 보인다.
  // 스토어프론트는 운영 빌드에서 이 버튼을 렌더하지 않도록 막아 두었지만,
  // 계정 자체가 남아 있으면 위험하므로 여기서도 확인한다.
  try {
    const { data: socials } = await query.graph({
      entity: "customer",
      fields: ["id", "email"],
    })
    const demoSocial = (socials ?? []).filter((c: any) =>
      /^(kakao|naver)-demo@/.test(String(c.email ?? ""))
    )
    if (demoSocial.length) {
      add(
        "BLOCK",
        "계정",
        "공용 데모 소셜 계정",
        `${demoSocial.length}건(${demoSocial.map((d: any) => d.email).join(", ")}) — ` +
          `이 계정으로 로그인하면 서로 다른 방문자가 같은 계정을 쓰게 됩니다.`,
        "실제 OAuth 연동 후 이 계정을 삭제하세요. 운영 빌드에서는 버튼이 숨겨지지만 계정은 남아 있습니다."
      )
    } else {
      add("OK", "계정", "공용 데모 소셜 계정", "0건")
    }
  } catch {
    add("WARN", "계정", "데모 소셜 계정 확인 실패", "customer 조회 불가")
  }

  // ═══ 7. 관리자 계정 ══════════════════════════════════════════════════════
  try {
    const { data: users } = await query.graph({ entity: "user", fields: ["id", "email"] })
    const demo = (users ?? []).filter((u: any) => /@shop\.local$|@example\.com$/.test(String(u.email ?? "")))
    if (demo.length) {
      add(
        "BLOCK",
        "관리자",
        "데모 계정",
        `${demo.length}건(${demo.map((d: any) => d.email).join(", ")}) — 비밀번호가 공개된 데모 값일 수 있습니다.`,
        "실제 관리자 계정 생성 후 데모 계정 삭제 또는 비밀번호 변경"
      )
    } else {
      add("OK", "관리자", "데모 계정", "0건")
    }
    add("OK", "관리자", "계정 수", `${(users ?? []).length}명`)
  } catch {
    add("WARN", "관리자", "조회 실패", "user 조회 불가")
  }

  // ═══ 출력 ════════════════════════════════════════════════════════════════
  const icon = (l: Level) => (l === "BLOCK" ? "🔴" : l === "WARN" ? "🟡" : "✅")
  const blocks = rows.filter((r) => r.level === "BLOCK")
  const warns = rows.filter((r) => r.level === "WARN")

  logger.info("")
  logger.info("══════════ 판매 개시 전 준비상태 점검 ══════════")
  let lastArea = ""
  for (const r of rows) {
    if (r.area !== lastArea) {
      logger.info(`\n[${r.area}]`)
      lastArea = r.area
    }
    logger.info(`  ${icon(r.level)} ${r.title} — ${r.detail}`)
    if (r.action && r.level !== "OK") logger.info(`      → ${r.action}`)
  }

  logger.info("")
  logger.info("══════════════════ 판정 ══════════════════")
  if (blocks.length === 0 && warns.length === 0) {
    logger.info("✅ 판매를 시작해도 되는 상태입니다.")
  } else if (blocks.length === 0) {
    logger.info(`🟡 판매는 가능하지만 확인이 필요한 항목이 ${warns.length}건 있습니다.`)
  } else {
    logger.info(`🔴 이 상태로 열면 안 됩니다 — 차단 항목 ${blocks.length}건 / 경고 ${warns.length}건`)
    logger.info("")
    logger.info("반드시 해결해야 하는 것:")
    for (const b of blocks) logger.info(`  · [${b.area}] ${b.title} — ${b.detail}`)
  }
  logger.info("═══════════════════════════════════════════")

  if (blocks.length > 0) {
    process.exitCode = 1
  }
}
