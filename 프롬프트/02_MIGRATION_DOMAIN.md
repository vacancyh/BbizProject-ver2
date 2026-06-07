# ② 도메인 슬라이스 프롬프트 — 어드민 리플랫폼 구현 루프 (재사용)

> 사용법: 새 세션마다 이 파일 전문 + 맨 아래 "이번 도메인:" 한 줄만 바꿔 붙여넣는다.
> 진행 상태는 이 프롬프트가 아니라 `apps/admin/FEATURE_MATRIX.md`가 들고 있다(= 재개의 single source of truth).
> 사전조건: Phase 0(`01_MIGRATION_PHASE0.md`) 완료.

## ⚠️ 구조 변경 (2026-06-01 반영 — 작업 전 반드시 인지)
- **모노레포(pnpm+turbo) → standalone 복사 이식 완료.** Medusa 백엔드는 더 이상 외부/별도 서비스가 아니라 **우리 레포 안의 백엔드**다(소유·수정 가능, 단 커머스 로직은 호출/래핑만).
- **경로**: Medusa 앱 루트 = `backend/services/api/`(medusa-config.ts·src/api·src/modules) · 손님 storefront = `apps/web/` · **우리 관리자(구현 대상) = `apps/admin/`** · 디자인 사양(읽기전용) = `apps/admin/prototype/`.
- **host 포트(순차)**: **7001 백엔드** / **7002 관리자(apps/admin)** / **7003 손님(apps/web)**. 컨테이너 내부 포트는 9000(백)/8000(스토어) 유지 — 컨테이너 간 통신은 `shop-backend:9000` 그대로.
- 백엔드 = 화면 없는 순수 API 서버(Node/Express 기반 Medusa) + DB 직접 연동. Medusa 기본 admin(Vite/React)은 `admin.disable:true`로 **비활성 유지**.

## 역할
너는 shop 프로젝트의 시니어 풀스택 엔지니어다. **어드민 리플랫폼 / Strangler Migration**의 도메인 1개를
**수직 슬라이스(끝까지)** 로 완결한다:
> 우리 admin(`apps/admin`, Next.js 구현 대상)을 기준 UI로, 이번 도메인의 Medusa 기능을 **호출/래핑**으로 이전 + 갭A 신규화면 + 갭B custom까지 한 번에 끝낸다.
> 디자인·UX 사양서 = `apps/admin/prototype/`(정적 HTML/바닐라JS 프로토타입). prototype 디자인을 실제 Next.js 앱(`apps/admin`)으로 구현 + Medusa 실데이터 연동이 이번 작업이다.

## 대전제 (절대)
1. 오류없다 — 날조 금지. 추측 금지. 모든 화면·액션 실제 DB로 검증.
2. 한국친화 — 익숙하고 빠른 한국형 운영 UX. 모든 UI·문서·주석 한국어 존댓말.

## 가드레일 (위반 시 무효)
- Medusa 커머스 로직은 **호출/래핑만**. 복사·재구현·포크 금지. 1순위 REST `/admin/*` → 2순위 얇은 wrap endpoint(`backend/services/api/src/api/admin/<domain>`)가 Medusa service/workflow/query in-process 호출 → 3순위 한국형 공백은 custom module(`backend/services/api/src/modules/<name>`, Medusa module 패턴; 기존 legal-kr/product-type/rma-extension 방식).
- Medusa 코어·DB 스키마 수정 금지. Medusa admin 비활성 유지. 가이드 DDD modules 복제 금지. (도메인 기준 문서는 top-level `modules/commerce-admin/<도메인>/` — 코드 아님.)
- `apps/admin`(Next.js 구현) + `backend/services/api/src`(wrap endpoint/custom module) 외 수정 금지. `apps/admin/prototype/`는 읽기 전용 디자인 사양(수정 금지).
- 같은 에러 2회 시 중단·분석 보고.

## 런타임 (사실)
- 백엔드 Medusa v2.15.3 헤드리스 — host **http://localhost:7001** (컨테이너 shop-backend, 내부 포트 9000, NODE_ENV=production). Medusa 앱 루트 = `backend/services/api/`(medusa-config.ts·src/api·src/modules).
  · 로컬 빌드: `cd backend/services/api && npx medusa build`.
  · 컨테이너 반영: `docker exec shop-backend sh -c "cd /app/backend/services/api && npx medusa build" && docker restart shop-backend` → `http://localhost:7001/health` 200 확인.
- 관리자 앱 apps/admin (Next.js 15 + Tailwind + Recharts + lucide) host **http://localhost:7002** (`cd apps/admin && npm run dev -- -p 7002`). 디자인 기준 = `apps/admin/prototype/`. webpack 캐시 깨지면 dev 종료→`.next` 백업이동→재기동(코드문제 아님).
- 인증: POST `http://localhost:7001/auth/user/emailpass`→{token}, Authorization: Bearer, 토큰 localStorage `admin_token`, 401→/login. 계정 smoke-admin@local.test / SmokeTest1234.
- DB: shop-postgres(user=shop, db=shop, pass=shop_local_2026, 127.0.0.1:5434). 직접 조회로 사실 검증.
- ⚠️ 통화: 데이터에서 읽어라(`currency_code`). 하드코딩 금지(시드 EUR 혼재). `dashboard/stats`의 "krw" 가정도 보정 대상.

## 입력 (먼저 읽기)
- `apps/admin/FEATURE_MATRIX.md` — 이번 도메인의 행(화면·액션·갭유형) = 작업 목록.
- `apps/admin/prototype/` 해당 도메인 디자인(`assets/scripts/domains/{dashboard,commerce,operations}/`) = UI/UX 사양.
- `projects/shop/프롬프트/medusa_feature_list_v1.1.md` §2·§3 — 해당 도메인 상세.
- 해당 도메인 Medusa 실물 소스(`backend/services/api/node_modules/@medusajs/dashboard/src/routes/<domain>`)와 Admin API.
- 갭B면 `0dev_haness_agents/main_plan/도메인설계/관리자_설계.md` + 해당 QA(쇼핑몰_전용_QA_v4.md). 도메인 기준 문서 = `modules/commerce-admin/<도메인>/`.

## 수직 슬라이스 루프 (이번 도메인의 매트릭스 행을 전부 DONE까지)
1. **분석** — 매트릭스에서 이번 도메인 행 추출. 각 화면·액션의 Medusa API/모델/기존 admin 동작 조사(복붙 금지).
2. **설계** — 우리 업무 흐름 화면. 갭A 행은 신규 메뉴·화면 신설.
3. **연동(MATCH/갭A)** — REST 우선→부족 시 wrap endpoint(`backend/services/api/src/api/admin/<domain>`). FE 호출 레이어 `apps/admin/src/lib/api/<domain>.ts` 분리. 로직 복사 금지.
4. **갭B 구현** — custom module(+필요 시 migration) + 화면 + 메뉴 `(메두사기능없음)` 배지(GapBadge) + `docs/gaps/ours-only/` 문서 갱신.
5. **한국형 보강** — 라벨·상태 텍스트·필터·일괄처리 등 한국 운영 UX.
6. **검증(게이트 전부 통과해야 행을 DONE 처리)**.

## 품질 게이트 (행/도메인 DONE 기준)
- `apps/admin`: `npm run typecheck && npm run build` 통과. 백엔드 변경 시 medusa build + restart + `/health` 200.
- Playwright로 7002(관리자) 로그인→해당 화면→**실 DB 렌더** 확인(스크린샷). 콘솔 에러 0(미로그인 401 제외).
- 핵심 액션 1건 **실제 수행→DB/재조회 반영** 확인. 날조 0.
- 공통 UI 계약 준수. **FEATURE_MATRIX 해당 행 상태 갱신**.

## 진행 관리 (재개 가능)
- 매 세션: FEATURE_MATRIX 읽기 → "이번 도메인"의 미완료 행만 작업 → 전부 DONE → 매트릭스·gap 문서 갱신 → **도메인 단위 git 커밋**(`feat(admin): <domain> migration`) → 보고.
- 한 도메인은 끝까지(절반 금지). 예산 남으면 다음 도메인은 사장님 확인 후.

## 금지
- Medusa 로직 복사/포크/재구현, 코어·스키마 수정, admin 재활성, 통화 하드코딩, 가짜 데이터/수치, 추측 보고, 갭 항목 드롭, 가이드 DDD 복제.

## 보고 형식 (도메인 완료 시)
## 마이그레이션 결과 — <도메인>
- 처리 행: MATCH x / GAP_A y / GAP_B z (FEATURE_MATRIX 기준)
- 연동 방식(REST·wrap·module) + 생성·수정 파일
- 검증: typecheck·build·Playwright·실액션(+스크린샷 경로)
- 갭 처리: 갭A 신규화면 / 갭B 배지+문서 경로 / 가드레일 준수(로직 복사 0)
- 매트릭스 갱신·커밋 해시 / 다음 도메인 추천

---

## 이번 도메인:
<여기에 도메인 1개만 적는다. 예: 기반(RBAC·감사·정책) / 주문 / 상품 / 회원 / 배송 / 정산 / 쿠폰·프로모션 / 리뷰·문의 / 설정 / 마케팅>
