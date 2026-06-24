# ① Phase 0 프롬프트 — 어드민 리플랫폼 설계/스캐폴드 (1회용)

> 사용법: 새 세션에서 이 파일 전문을 붙여넣고 시작. Phase 0는 전체에서 1번만 수행한다.
> 끝나면 `02_MIGRATION_DOMAIN.md` 루프로 넘어간다.

## ⚠️ 구조 변경 (2026-06-01 반영 — 작업 전 반드시 인지)
- **모노레포(pnpm+turbo) → standalone 복사 이식 완료.** Medusa 백엔드는 외부/별도 서비스가 아니라 **우리 레포 안의 백엔드**다(소유·수정 가능, 단 커머스 로직은 호출/래핑만, 복사·포크 금지).
- **경로**: Medusa 앱 루트 = `backend/services/api/`(medusa-config.ts·src/api·src/modules) · 손님 storefront = `apps/web/` · **우리 관리자(구현 대상) = `apps/admin/`** · 디자인 사양(읽기전용) = `apps/admin/prototype/`.
- **host 포트**: **9000 백엔드** / **7002 관리자(apps/admin)** / **8000 손님(apps/web)**.
  · (갱신 2026-06-24) 과거 Docker 호스트 매핑(7001→컨테이너 9000, 7003→8000) 전제였으나, **사내 TLS 검사로 컨테이너 빌드가 막혀** 하이브리드로 전환했습니다: DB/Redis만 Docker(5434/6381), 앱 3종은 호스트에서 네이티브 실행. 따라서 백엔드는 host에서 직접 **:9000**, 스토어프론트 **:8000**.
- 백엔드 = 화면 없는 순수 API 서버(Node/Express 기반 Medusa) + DB 직접 연동. Medusa 기본 admin(Vite/React)은 `admin.disable:true` **비활성 유지**.

## 역할
너는 shop 프로젝트의 시니어 풀스택 엔지니어다. 이번 작업은 "Medusa 기본 Admin 커스터마이징"이 아니라
**어드민 리플랫폼 / Strangler Migration (전수 이전)** 이다. Phase 0는 **구현이 아니라 설계·스캐폴드** 단계다:
> 우리 커스텀 관리자 앱(`apps/admin`, Next.js 구현 대상)을 기준 UI로 두고, Medusa Admin 의 모든 기능을 분석·전수 이전한다.
> 디자인·UX 사양서 = `apps/admin/prototype/`(정적 HTML/바닐라JS 프로토타입, 작동 데이터 아님). 울트라는 이 prototype 디자인을 실제 Next.js 앱(`apps/admin`)으로 구현하고 Medusa 실데이터에 연동한다.
> Phase 0 목표 = 커버리지 매트릭스 확정 + 정보구조 + 공통 UI 계약 + 횡단 모듈 경계 설계.

## 대전제 (절대)
1. 오류없다 — 날조 금지. 추측 금지. 실제 파일·DB·소스로만 판단.
2. 한국친화 — 익숙하고 빠른 한국형 운영 UX. 모든 UI·문서·주석 한국어 존댓말.

## 가드레일 (위반 시 무효)
- Medusa 커머스 로직은 **호출/래핑만**. 복사·재구현·포크 금지. 엔진은 Medusa 유지.
- Medusa 코어·DB 스키마 수정 금지. Medusa admin 비활성(`medusa-config.ts` `admin.disable:true`) 유지·재활성 금지.
- 가이드 `guide/project`의 DDD `modules/` 레이어를 shop에 복제 금지(= 재구현). shop custom module은 **Medusa module 패턴**(`backend/services/api/src/modules/<name>`)을 따른다. top-level `modules/commerce-admin/<도메인>/`는 도메인 기준 문서 위치(코드 아님).
- new-all 파이프라인(new-pm 등) 미사용. shop은 DAG 룰 제외. 본 작업은 직접 실행.
- 같은 에러 2회 시 중단·분석 보고.

## 반드시 먼저 읽을 입력 (추측 금지)
- `projects/shop/프롬프트/medusa_feature_list_v1.1.md` — Medusa 실물 35도메인 화면·액션 전수 + 양방향 갭(§2·§3) **= 매트릭스 시드**
- `projects/shop/0dev_haness_agents/main_plan/도메인설계/관리자_설계.md`, `main_plan/user_plan/쇼핑몰_전용_QA_v4.md` — 우리 요구(특히 갭B 한국형)
- `projects/shop/apps/admin/prototype/` 전체 = 디자인·UX 사양서(정적 HTML/바닐라JS). `index.html` + `assets/{styles,scripts/{core,data,domains/{dashboard,commerce,operations}}}` → 사이드바·화면·UX 패턴 기준. 이걸 Next.js 앱(`apps/admin`)으로 구현한다.
- `backend/services/api/medusa-config.ts`(Medusa 앱 루트), 기존 custom module(`backend/services/api/src/modules/{legal-kr,product-type,rma-extension,state-machine}`)

## Phase 0 산출물 (이 5개를 만든다)
1. **`apps/admin/FEATURE_MATRIX.md`** (권위 트래커) — feature_list §2의 화면·액션을 **행 단위**로 전수 등재.
   컬럼: `Medusa기능(화면·액션) | 우리화면 대응 | 상태(TODO/DOING/DONE) | 갭유형(MATCH/GAP_A/GAP_B) | 도메인 | 문서경로 | 비고`
   - 갭A = Medusa有·우리화면 미정(신규설계 대상). 갭B = 우리有·Medusa無(custom + 배지).
   - 누락 0이 목표. 상태는 전부 TODO로 시작해도 됨(채워지는 게 핵심).
2. **정보구조(IA)/메뉴 확정** — 디자인 사양(`apps/admin/prototype/`의 사이드바·도메인 분류: dashboard/commerce/operations)을 기준으로, `apps/admin`(Next.js)의 네비게이션(`apps/admin/src/lib/mocks/navigation.ts` 또는 후속 실데이터 네비)을 매트릭스에 맞게 작성/갱신.
   - 갭B 메뉴/화면엔 `(메두사기능없음)` 배지 표시(아래 GapBadge).
   - 도메인별 수직 슬라이스 순서를 메뉴/매트릭스에 반영(기반→High→Medium).
3. **공통 UI 계약 컴포넌트 스캐폴드** (없으면 생성, 기존이면 정리):
   `DataTable, FilterBar, DetailDrawer, ConfirmModal, Toast, EmptyState, LoadingSkeleton, Pagination, GapBadge`
   - 패턴: PageHeader→SummaryCards→FilterBar→DataTable→DetailDrawer→ConfirmModal→Toast
   - 토큰: bg#F8FAFC surface#FFFFFF border#E5E7EB text#111827/#6B7280 primary#2563EB success#16A34A warning#D97706 danger#DC2626, radius10~12, system-ui, lucide, 이모지/손글씨 금지, 차트색≤4
   - 스캐폴드 = 동작하는 빈 컴포넌트 + props 계약. 도메인 데이터 바인딩은 ②번 루프에서.
4. **횡단(cross-cutting) 모듈 경계 설계** — RBAC(권한), 감사로그, 정책저장소(system_policies).
   - **설계 문서 + Medusa module 폴더 경계(스텁)만**(`backend/services/api/src/modules/<name>`). 전면 구현 X.
   - 이 3개는 모든 도메인이 의존 → ② 루프에서 **가장 먼저 구현할 "기반 도메인"** 으로 매트릭스 최상단 배치.
5. **`apps/admin/docs/gaps/` + gap 문서 템플릿** — `medusa-only/`(갭A), `ours-only/`(갭B) 하위. 템플릿: 기능설명·필요데이터·Medusa API 여부·우리화면 설계초안·구현계획.

## 품질 게이트 (Phase 0 완료 기준)
- `apps/admin`에서 `npm run typecheck && npm run build` 통과.
- FEATURE_MATRIX 전 행이 갭유형·도메인까지 분류됨(상태=TODO 허용). 누락 0.
- GapBadge가 갭B 메뉴에 실제 렌더(Playwright로 7002(관리자) 로그인→사이드바 스크린샷 확인).
- 공통 컴포넌트 스캐폴드가 import 가능(빈 렌더라도 빌드 통과).

## 금지
- Medusa 로직 복사/포크/재구현, 코어·스키마 수정, admin 재활성, 가이드 DDD modules 복제, 가짜 데이터/수치, 추측 보고, 갭 항목 드롭.

## 보고 형식 (Phase 0 종료 시)
## Phase 0 결과
- FEATURE_MATRIX: 총 N행 / MATCH a / GAP_A b / GAP_B c
- IA·메뉴 변경: (요약) + 갭B 배지 적용 메뉴 목록
- 공통 컴포넌트: 생성/정리 목록
- 횡단 모듈 설계: RBAC/감사/정책 경계 + 구현 순서 제안
- 검증: typecheck·build·Playwright(스크린샷 경로)
- 다음: ② 도메인 루프 시작 도메인 추천(기반→주문→…)

## 시작
위 입력 전부 읽고 → FEATURE_MATRIX부터 작성 → IA → 공통 컴포넌트 → 횡단 설계 → gap 문서.
깊게 추론(ultrathink)하고 단계마다 실제 소스/DB로 검증하라.
