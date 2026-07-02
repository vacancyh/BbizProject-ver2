# BbizProject 백엔드 (Medusa v2 API)

한국형 이커머스 백엔드. Medusa v2 위에 한국 커머스·운영 요건을 커스텀 모듈로 확장했다.
Medusa 기본 관리자 UI(`/app`)는 비활성이고, 자체 관리자 앱(`apps/admin`, :7002)이 `/admin` REST API를 사용한다.

- 로컬 포트: 백엔드 :9000 · 스토어프론트 :8000 · 관리자 :7002
- DB/캐시: Docker Postgres(5434) · Redis(6381)
- 접속/계정: [`docs/main_plan/user_plan/bizproject/03_접속정보_계정.md`](../../../docs/main_plan/user_plan/bizproject/03_접속정보_계정.md)
- 운영 전환·보안 체크리스트: [`docs/실서비스_연동_백로그.md`](../../../docs/실서비스_연동_백로그.md)

## 실행

```bash
# (최초) 마이그레이션
npx medusa db:migrate
# 개발 서버
npx medusa develop        # :9000
# 시드 (backend/services/api 에서)
npx medusa exec ./src/scripts/setup-korea.ts        # 리전/통화/세금/배송(필수 선행)
npx medusa exec ./src/scripts/seed-test-data.ts     # 테스트 상품/회원/주문
```

> 타입체크: `npx tsc --noEmit` (앱 소스는 `src/**`; `integration-tests/`·`*.spec.ts`는 미설치 테스트 deps로 오류가 날 수 있음).

## 커스텀 모듈 (`src/modules/`)

**기반(횡단)**: `rbac`(등급·메뉴별 CRUD 권한), `audit`(append-only 감사로그+PII 마스킹), `policy`(정책 저장소·이중확인·변경이력)

**주문·운영**: `order-ops-kr`(관리자 메모·강제취소), `order-exchange-group`(다건 교환), `state-machine`, `rma-extension`, `legal-kr/withdrawal-7day`(청약철회 7일)

**회원·정산**: `membership`(등급), `customer-point`(적립금 원장), `customer-sanction`(제재), `customer-consent`(동의 이력), `tax-invoice`(세금계산서), `settlement-payout`(정산)

**상품·진열**: `product-type`, `category-option-map`, `product-disclosure`(상품정보고시), `time-sale`, `restock-notification`, `product-curation`(조회수·위시·인기검색어·**베스트 랭킹**·금칙어)

**콘텐츠·운영**: `cms`(공지/FAQ/배너/홈큐레이션), `ops`(점검모드·헬스), `legal-kr/legal-doc`(약관 버전 관리)

**보안**: `admin-2fa`(관리자 TOTP 2단계 인증 — `admin_totp`·`admin_totp_session`·`admin_2fa_backup_code`. 순수 JS TOTP(RFC6238)·QR(`_utils/qr.ts`)·시크릿 AES-256-GCM(`_utils/secret-crypto.ts`)·백업코드·서버측 세션 게이팅)

## 주요 커스텀 라우트 (`src/api/`)

**store** (퍼블리셔블 키 필수):
- `GET /store/best-products?limit&days` — 베스트 랭킹(판매수량×10+조회수+위시×5)
- `POST /store/products/:id/view` — 상품 조회수 집계
- `GET|POST /store/popular-search-terms` — 인기 검색어(최소 2회 임계 + IP rate limit)
- `GET /store/curated-products` · `GET /store/banners` · `GET /store/notices|faqs` · `GET /store/legal-docs/:slug` · `GET /store/time-sales`
- `GET /store/products/:id/reviews`(+POST) · `GET /store/products/:id/disclosure`
- `POST /store/support-inquiries` · `POST /store/orders/lookup`(비회원) · `POST /store/orders/:id/request|confirm`
- `me/*`: `points`·`membership`·`consents`·`wishlist`·`addresses`(본인 데이터 격리)

**admin**:
- `POST /admin/2fa/setup|activate|verify|backup-codes` · `GET|DELETE /admin/2fa` — 2FA 라이프사이클
- 그 외 도메인별 `/admin/*` (cms·ops·policy·rbac·audit·review·membership 등)

## 횡단 미들웨어 (`src/api/middlewares.ts`)

- `rbacGuard` — `/admin/*` 등급별 CRUD 권한(거부 403), 보안메뉴 read super 전용
- `auditTap` — `/admin/*` write 2xx 시 감사 로그 기록(PII 마스킹)
- `twoFactorGuard` — 2FA 활성 관리자의 미검증 토큰 `/admin/*` 접근 403(`2FA_REQUIRED`)
- `authRateLimit` — `/auth/*` 실패 기반 rate limit(IP 5분 10회 → 429)
- `passwordPolicyGuard` — 가입/재설정 비밀번호 정책(8자+영문+숫자)
- `storeOrderOwnershipGuard` — `GET /store/orders/:id` IDOR 방지(본인 주문만, 그 외 404)

rate limit 저장소는 캐시 서비스 추상화(`_utils/rate-limit.ts`) — 운영에서 `@medusajs/cache-redis` 구성 시 다중 인스턴스 공유, 미가용 시 인메모리 폴백(fail-open).

## 보안 유틸 (`src/api/_utils/`)

`text.ts`(입력 길이 상한) · `totp.ts`(TOTP) · `qr.ts`(QR 인코더) · `secret-crypto.ts`(AES-256-GCM) · `rate-limit.ts`(캐시 기반 rate limit)

보안 헤더/CSP는 각 프런트 앱의 `next.config`에 설정. 상세 체크리스트는 [실서비스_연동_백로그 §10](../../../docs/실서비스_연동_백로그.md).

---

> 기반: [Medusa v2](https://docs.medusajs.com) (`@medusajs/medusa` >= 2). 아키텍처·모듈 개념은 Medusa 공식 문서 참고.
