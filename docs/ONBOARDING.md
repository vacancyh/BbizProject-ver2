# Shop 프로젝트 — 초보 개발자 온보딩 가이드

목적
- 본 문서는 C:\study\BbizProject-ver2 저장소의 전체 구조, 핵심 기능, 화면(대략), AI 활용 방식, 로컬 개발 환경 설정 및 주요 워크플로우를 초보 개발자 관점에서 정리합니다.

대상
- 이 저장소에 처음 참여하는 개발자(프론트/백엔드/풀스택 초심자)

요약 구조
- apps/               : 배포 가능한 앱들
  - web              : Next.js 스토어프런트 (포트 8000)
  - admin            : 관리자 앱(Next.js, 포트 7002)
- backend/            : Medusa 기반 백엔드 서비스 (backend/services/api, 포트 9000)
- modules/            : 도메인별 모듈(상품, 주문, 결제 등)
- packages/           : 재사용 가능한 패키지 (UI 컴포넌트 등)
- infra/              : 배포/인프라 관련 코드 (CD/DB 스크립트 등)
- ai/                 : AI 관련 프롬프트, 정책, 평가 스크립트
- docs/               : 프로젝트 문서(여기에 온보딩 파일 포함)

현행 로컬 환경(중요)
- 하이브리드 구동: Docker(Postgres :5434 · Redis :6381) + 호스트 네이티브 실행(백엔드 :9000 · 관리자 :7002 · 스토어프런트 :8000).
- 국내(한국/KRW) 설정 완료: 기본 통화 KRW, 리전 한국(kr), 부가세 10%, 국내 배송옵션, 국내 물류창고. 스토어프런트 기본 진입 `/kr`.
- 보조 도구: `scripts/healthcheck.ps1`(전 서비스/포트 상태 점검), 관리자 `pnpm test:sweep`(전 화면 헬스 스윕). CI: `.github/workflows/ci.yml`(타입체크·린트 게이트).
- 셋업 상세: `docs/main_plan/user_plan/bizproject/프런트개발_셋업_가이드.md` 참고.

핵심 커스텀 기능(최근 구현 · 참고 문서)
- 관리자 2FA(TOTP): `설정 > 2단계 인증`(`/settings/security`). 모듈 `backend/services/api/src/modules/admin-2fa`. → `apps/admin/docs/gaps/ours-only/admin-2fa.md`
- 상품 큐레이션·분석: 베스트 랭킹(`GET /store/best-products`)·조회수 트래킹·인기검색어. 모듈 `product-curation`. → `.../ours-only/curation-analytics.md`
- 보안 하드닝: 주문 IDOR 가드·rate limit(Redis-ready)·비번정책·입력상한·CSP. → `.../ours-only/security-hardening.md`
- 기능 전체 현황: `apps/admin/FEATURE_MATRIX.md`, 화면 현황: `docs/main_plan/user_plan/bizproject/07_화면별_백로그.md`, 운영/보안: `docs/실서비스_연동_백로그.md`

핵심 기술 스택
- 백엔드: Medusa (Node/TypeScript)
- 프론트: Next.js (React) — apps/web (스토어프런트), apps/admin (관리자)
- 패키지 매니저: pnpm (packageManager: pnpm@11.3.0 표기)
- DB/캐시: Postgres(:5434) · Redis(:6381) — 로컬은 Docker 컨테이너로 구동
- 테스트: jest, vitest, Playwright 등 일부 패키지에서 사용
- 기타: TailwindCSS, Vite(개발용 일부 패키지)

빠른 시작 (Windows 기준)
1) 필수 설치
   - Node.js >= 20
   - pnpm (권장 버전: 11.x)
   - Docker Desktop (Postgres :5434 · Redis :6381 컨테이너 구동용)
   - Git

2) 코드 가져오기 (이미 복제됨)
   cd C:\study\BbizProject-ver2

3) 의존성 설치 (워크스페이스 설치)
   pnpm install -w

4) 환경 설정
   - 앱별 템플릿을 복사하여 사용:
     copy apps\admin\.env.example apps\admin\.env.local
     copy apps\web\.env.example apps\web\.env.local
     (백엔드는 backend\services\api\.env.template 참고하여 .env 작성)
   - DB 접속 정보, Redis, JWT 시크릿, 퍼블리셔블 키(pk_...) 등 변수 채우기
   - 백엔드(메두사) 문서(backend/services/api/README.md)를 참고하여 DB 마이그레이션/시드 수행

5) 서비스 실행(개별적으로)
   - 백엔드 (개발)
     cd C:\study\BbizProject-ver2\backend\services\api
     pnpm dev
     (또는 `medusa develop` 스크립트가 실행됨)

   - 스토어프런트
     cd C:\study\BbizProject-ver2\apps\web
     pnpm dev
     (기본 포트: 8000)

   - 관리자 앱
     cd C:\study\BbizProject-ver2\apps\admin
     pnpm dev
     (기본 포트: 7002)

6) 테스트 실행 예시
   - 백엔드 단위/통합 테스트
     cd backend\services\api
     pnpm test:unit
     pnpm test:integration:http

   - 관리자 앱
     cd apps\admin
     pnpm test

프로젝트 주요 폴더 설명 (상세)
- apps/web: Next.js 기반 Storefront. 고객-facing UI, 결제 연동(Stripe), i18n 등 포함.
- apps/admin: 한국형 관리자 대시보드(Next.js). 리포트/차트, 주문/상품 관리 UI 포함.
- backend/services/api: Medusa 기반 commerce API. 모듈화된 서비스(orders, products 등).
- modules/*: 도메인별 논리(예: commerce-admin/product, order, payment 등). 각 모듈의 README 확인.
- packages/ui/admin-prototype: 디자인 프로토타입에서 추출할 공통 UI 컴포넌트 명세.
- ai/: 프롬프트 템플릿, 정책, 평가 스크립트. 내부 에이전트/자동화에서 사용되는 템플릿이 이곳에 있다.

AI(인공지능) 관련 안내
- 위치: ai/ 폴더 (prompts, policies, evaluations 등)
- 역할: 개발 문서 생성, 자동화된 코드 제안/리팩터링 보조, 테스트 케이스 생성, PR/커밋 메시지 템플릿 등
- 사용 가이드:
  1. prompts/ 폴더의 템플릿을 복제하여 프로젝트별 프롬프트를 작성
  2. 변경 후에는 평가(evaluations/)를 통해 품질을 검증
  3. 민감 정보는 prompts나 policy에 넣지 말 것(절대 커밋 금지)

초보자를 위한 단계별 작업 예시
1) 작은 이슈(버그/문서) 고치기
   - 관련 모듈의 README 확인
   - 로컬에서 변경 후 테스트 실행
   - 포맷/린트 통과 확인 후 PR 생성

2) 새 기능 개발
   - 이슈 생성 → 설계(간단한 ADR) → 구현 → 단위/통합 테스트 → 리뷰 → 병합

3) UI 작업 흐름
   - packages/ui/admin-prototype를 참고하여 공통 컴포넌트 재사용
   - 앱에서는 해당 컴포넌트를 import 하여 사용

개발 규칙(권장)
- 코드 스타일: 프로젝트의 existing eslint/prettier 설정을 따를 것
- 브랜치 이름: feature/<간단한-설명> 또는 fix/<이슈번호>-요약
- 커밋 메시지: 의도와 이유를 짧게 적기
- PR: 변경 범위와 테스트 방법을 명시

문서/참고 위치
- backend/services/api/README.md — Medusa 관련 설정과 Quickstart
- modules/*/README.md — 각 도메인별 설명
- packages/ui/admin-prototype/README.md — 공통 UI 명세
- ai/prompts/README.md — AI 프롬프트 구조

문제 해결 팁
- 의존성 문제: Node 버전(>=20)과 pnpm 버전 확인
- 서버가 포트 충돌 시 포트 변경 또는 기존 프로세스 종료
- DB 연결 오류: .env 설정, DB 서비스 상태 확인

온보딩 체크리스트 (간단)
[ ] Node 20 설치
[ ] pnpm 설치
[ ] PostgreSQL 준비
[ ] `pnpm install -w` 실행
[ ] `.env` 작성 (.env.example 참고)
[ ] 백엔드/프론트 각각 dev 서버 실행 확인
[ ] README 및 모듈별 문서 3개 이상 읽기

도움이 필요하면
- 먼저 관련 README(특히 backend/services/api/README.md, modules/*/README.md)를 읽어주세요.
- 구체적 오류(터미널 출력, 로그)를 알려주시면 해결을 도와드리겠습니다.

---
작성자: 온보딩 스크립트 자동 생성
작성일: 2026-06-07
