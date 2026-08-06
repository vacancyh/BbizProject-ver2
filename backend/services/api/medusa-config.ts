import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const IS_PROD = process.env.NODE_ENV === "production"

// 보안(보안점검 2026-07-27): 서명 시크릿은 운영에서 강력한 무작위 값 필수.
// 미설정/약함/"supersecret" 이면 운영 부팅 실패(fail-fast). dev 는 경고 후 폴백(로컬 개발 유지).
function requireSecret(name: string): string {
  const v = process.env[name]
  const weak = !v || v === "supersecret" || v.length < 16
  if (IS_PROD && weak) {
    throw new Error(`[security] ${name} must be set to a strong random value (>=16 chars) in production`)
  }
  if (weak) {
    // eslint-disable-next-line no-console
    console.warn(`[security] ${name} 미설정/약함 — INSECURE dev 폴백 사용. 운영 배포 금지.`)
    return v || `dev-insecure-${name.toLowerCase()}`
  }
  return v
}

module.exports = defineConfig({
  // ─── 피처 플래그 ─────────────────────────────────────────────────────────
  // translation: 다국어 콘텐츠 번역(상품명·설명·카테고리명 등)을 켠다.
  //   이 플래그가 꺼져 있으면 `/store/locales`·`/admin/translations` 라우트가
  //   **404 로 응답한다** — 모듈을 등록하고 마이그레이션을 돌려도 마찬가지다(2026-08-05 실측).
  //   기본값은 false 이므로 여기서 명시적으로 켠다. env 로 끌 수도 있다(MEDUSA_FF_TRANSLATION=false).
  featureFlags: {
    translation: process.env.MEDUSA_FF_TRANSLATION !== "false",
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: requireSecret("JWT_SECRET"),
      // 인증 토큰 수명(기본 1d). 운영은 짧게(예: 관리자망 8h) + 재로그인/리프레시 권장.
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
      cookieSecret: requireSecret("COOKIE_SECRET"),
    },
    // 로컬 http 환경에서는 secure 쿠키를 끕니다.
    // NODE_ENV=production + secure 쿠키(기본 true)이면 express-session 이
    // http 요청에 Set-Cookie 를 보내지 않아 세션이 유지되지 않습니다(로그인 무한 루프).
    // 운영(https) 배포 시 COOKIE_SECURE=true 로 설정하세요.
    // cookieOptions = projectConfig 레벨(http 안 아님), express-session 의 cookie 옵션입니다.
    cookieOptions: {
      // 보안점검 2026-07-27(M8): 운영은 기본 secure=true(https). http 종단 프록시면 COOKIE_SECURE=false 로 해제.
      // dev 는 기존과 동일(기본 false — 로컬 http 세션 유지).
      secure: IS_PROD ? process.env.COOKIE_SECURE !== "false" : process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      httpOnly: true,
    },
  },
  // Medusa 기본 관리자 화면(/app) 비활성화 — 자체 관리자 앱(apps/admin, :7002)으로 대체.
  // 화면(UI)만 끄고 /admin REST API 는 그대로 살아있어 새 앱이 데이터를 받습니다.
  // (납품 시에도 고객은 자체 관리자만 사용)
  admin: {
    disable: true,
  },
  modules: [
    // 분산 락(2026-07-28, 2026-08-03 갱신) — 적립금 사용/해제 같은 금전 임계구역을
    // **고객 단위** 락으로 직렬화한다(카트 단위였을 때 카트를 여러 개 만들어 우회 가능했음).
    // 기본 provider 는 **in-memory** 라 프로세스 단위로만 유효하므로,
    // API 인스턴스를 2대 이상 띄우면 락이 무력화된다(이중 차감/복원 위험).
    // → LOCKING_REDIS_URL(없으면 REDIS_URL) 이 있으면 Redis provider 를 기본으로 등록한다.
    ...(process.env.LOCKING_REDIS_URL || process.env.REDIS_URL
      ? [
          {
            resolve: "@medusajs/locking",
            options: {
              providers: [
                {
                  resolve: "@medusajs/locking-redis",
                  id: "locking-redis",
                  is_default: true,
                  options: {
                    redisUrl: process.env.LOCKING_REDIS_URL || process.env.REDIS_URL,
                  },
                },
              ],
            },
          },
        ]
      : []),
    // ─── 다국어 콘텐츠 번역 (2026-08-05 활성화) ─────────────────────────────
    //
    // Medusa 2.15.3 에 이미 들어 있는 모듈인데 **등록이 안 돼 있어 잠들어 있었다.**
    // 그래서 `/store/locales` 가 404 였고, 스토어프론트의 언어 선택 UI 가
    // 목록을 못 받아 화면에 안 보였다(코드는 이미 있었다).
    //
    // 무엇을 해 주나:
    //   · `locale`               지원 언어 목록 (로더가 기본 언어 60여 개 자동 시드, ko-KR/en-US 포함)
    //   · `translation`          엔티티별·언어별 필드 번역값 (reference + reference_id + locale_code)
    //   · `translation_settings` 어떤 엔티티의 어떤 필드를 번역 대상으로 볼지
    //
    // 어떻게 쓰나:
    //   관리자 — GET/POST `/admin/translations` · `/admin/translations/settings` · `/admin/locales`
    //   고객   — `x-medusa-locale` 헤더를 붙이면 상품·카테고리 응답이 해당 언어로 치환된다
    //            (스토어프론트는 `lib/util/get-locale-header.ts` 에서 이미 붙이고 있다)
    //
    // ⚠️ 이건 **운영자가 관리하는 콘텐츠**(상품명·설명·카테고리명) 전용이다.
    //    화면 버튼·안내문 같은 UI 라벨은 번역 대상이 아니라 코드(ko/en 메시지)에서 관리한다.
    {
      resolve: "@medusajs/translation",
      // 커스텀 모듈(공지·FAQ·배너·약관·상품고시)은 **모듈 옵션이 아니라 모델에서** 지정한다.
      // 필드에 `.translatable()` 을 붙여야 번역 대상으로 인정된다
      // (모듈 옵션에 넣어도 "notice is not a translatable entity" 로 거부된다 — 2026-08-05 실측).
      //
      // ⚠️ 표시만으로는 코어가 응답에 **자동 적용해 주지 않는다.**
      //    각 store 라우트에서 `applyTranslations()` 를 호출해야 화면에 반영된다
      //    (src/api/_utils/apply-translations.ts).
    },
    {
      resolve: "./src/modules/state-machine",
    },
    {
      resolve: "./src/modules/rma-extension",
    },
    {
      resolve: "./src/modules/legal-kr/withdrawal-7day",
    },
    {
      // 약관 관리(GAP_B) — 이용약관·개인정보처리방침 등 버전별 관리 + 동의 재요청 트리거(d5 연동).
      resolve: "./src/modules/legal-kr/legal-doc",
    },
    {
      // 한국형 커머스 확장 — 상품유형(옵션 템플릿 + 2단계 고시 정의)
      // 의류→사이즈/색상, 악세서리→손가락 호수 등. (분류 3축 중 ② 상품유형)
      resolve: "./src/modules/product-type",
    },
    {
      // 카테고리 ↔ 옵션템플릿 N:M 매핑. 진열 카테고리별 기본 옵션 힌트 제공.
      // (분류 3축 중 ① 진열카테고리 + ② 상품유형 연결 브릿지)
      resolve: "./src/modules/category-option-map",
    },
    {
      // 기반(횡단) — 관리자 권한(RBAC). 등급·메뉴별 CRUD. 미들웨어에서 권한 판정.
      resolve: "./src/modules/rbac",
    },
    {
      // 기반(횡단) — 감사 로그(append-only). 모든 write 액션 기록 + PII 마스킹.
      resolve: "./src/modules/audit",
    },
    {
      // 기반(횡단) — 정책 저장소(system_policies 통합 + 이중확인 + 변경이력).
      resolve: "./src/modules/policy",
    },
    {
      // 주문 운영(한국형) — 관리자 메모 + 강제취소 사유(GAP_B). Medusa order 는 호출/래핑.
      resolve: "./src/modules/order-ops-kr",
    },
    {
      // 리뷰·문의(GAP_B) — 상품 리뷰 + 고객 문의. 운영자 공개/숨김 + 답변. Medusa 코어 없음.
      resolve: "./src/modules/review",
    },
    {
      // 운영 유틸리티(GAP_B) — 점검모드(all/storefront/admin) ON/OFF + 인프라 헬스 응답.
      resolve: "./src/modules/ops",
    },
    {
      // 다건 교환 그룹(D11) — 교환 묶음 + 1회 회수 운송장 + 차액 합산. t005 교환 spec.
      resolve: "./src/modules/order-exchange-group",
    },
    {
      // 회원 멤버십(d5 t004, GAP_B) — 고객별 누적금액·등급 영속 + 룰 재산정.
      // 등급 정책(tiers)은 policy 모듈 membership.tiers 재사용. Medusa customer 미수정.
      resolve: "./src/modules/membership",
    },
    {
      // 포인트(d5 t005, GAP_B) — 적립/사용/소멸 원장(append-only) + 잔액 계산.
      resolve: "./src/modules/customer-point",
    },
    {
      // 제재·블랙리스트(d5 t006, GAP_B) — 단계 상승/해제 + 로그인 차단 판정.
      resolve: "./src/modules/customer-sanction",
    },
    {
      // 세금계산서(d5 t007, GAP_B) — 사업자번호 검증 + 발급/정정/취소 상태.
      resolve: "./src/modules/tax-invoice",
    },
    {
      // 동의 이력(d5 t008, GAP_B) — 채널별 동의/철회 이력 + 2년 재확인 판정.
      resolve: "./src/modules/customer-consent",
    },
    {
      // 정산 지급(d7, GAP_B) — 기간별 스냅샷(매출/환불/PG수수료/순정산) + 마감/지급 상태머신.
      resolve: "./src/modules/settlement-payout",
    },
    {
      // 타임세일(d3, GAP_B) — 세일 활성판정·세일가 룰(설정값 주입). cron·큐레이션·원가복원 deferred.
      resolve: "./src/modules/time-sale",
    },
    {
      // 상품 큐레이션(d3, GAP_B) — 조회수·위시리스트·인기검색어·금칙어 관리.
      resolve: "./src/modules/product-curation",
    },
    {
      // 상품정보고시(d3, GAP_B) — 전자상거래법 고시 버전 이력 관리(draft→published→archived).
      resolve: "./src/modules/product-disclosure",
    },
    {
      // 한국형 알림(2026-08-03) — 알림 시점 정의 + 문구 템플릿 + 발송 이력.
      // 발송 업체는 provider 추상화로 분리돼 있어, 계약 후 구현체만 갈아끼우면 된다.
      resolve: "./src/modules/notification-kr",
    },
    {
      // 재입고 알림(GAP) — 품절 상품 재입고 시 고객 알림 구독.
      resolve: "./src/modules/restock-notification",
    },
    {
      // 고객센터 콘텐츠(GAP) — 공지/FAQ 관리(admin) + 노출(store).
      resolve: "./src/modules/cms",
    },
    {
      // 관리자 2FA(TOTP) — 백오피스 2단계 인증(무비용, 옵트인).
      resolve: "./src/modules/admin-2fa",
    },
    {
      // 휴면계정(개인정보보호법) — 고객 활동시각 추적 + 휴면/임박 판정.
      resolve: "./src/modules/customer-dormancy",
    },
  ],
})
