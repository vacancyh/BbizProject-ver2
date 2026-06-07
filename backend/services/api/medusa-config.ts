import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    // 로컬 http 환경에서는 secure 쿠키를 끕니다.
    // NODE_ENV=production + secure 쿠키(기본 true)이면 express-session 이
    // http 요청에 Set-Cookie 를 보내지 않아 세션이 유지되지 않습니다(로그인 무한 루프).
    // 운영(https) 배포 시 COOKIE_SECURE=true 로 설정하세요.
    // cookieOptions = projectConfig 레벨(http 안 아님), express-session 의 cookie 옵션입니다.
    cookieOptions: {
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      httpOnly: true,
    },
  },
  // Medusa 기본 관리자 화면(/app) 비활성화 — 자체 관리자 앱(apps/admin, :7001)으로 대체.
  // 화면(UI)만 끄고 /admin REST API 는 그대로 살아있어 새 앱이 데이터를 받습니다.
  // (납품 시에도 고객은 자체 관리자만 사용)
  admin: {
    disable: true,
  },
  modules: [
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
  ],
})
