Shop 프로젝트 — 초보 개발자 상세 온보딩 (버전 2)

요약
- 목적: 이 문서는 새로 투입되는 초보 개발자가 빠르게 로컬 개발환경을 구성하고 코드 구조와 개발 흐름을 이해해 바로 기여할 수 있도록 실전 중심으로 정리합니다.
- 위치: C:\study\BbizProject-ver2 (로컬 복제 경로)
- 현행: 국내(한국/KRW) 설정 완료(기본 통화 KRW·리전 kr·부가세 10%·국내 배송·국내 물류창고), 스토어프런트 기본 진입 `/kr`. 보조: `scripts/healthcheck.ps1`, 관리자 `pnpm test:sweep`, CI `.github/workflows/ci.yml`(타입체크·린트). 셋업 상세는 `docs/main_plan/user_plan/bizproject/프런트개발_셋업_가이드.md`.

1. 전체 구조(빠른 개요)
- apps/
  - web: 스토어프런트 (Next.js, 포트 8000)
  - admin: 관리자 앱 (Next.js, 포트 7002)
- backend/
  - services/api: Medusa 기반 백엔드 서비스 (TypeScript)
- modules/: 도메인별 기능 모듈 (product, order, payment 등)
- packages/: 공통 라이브러리/컴포넌트
- infra/: 배포/인프라 스크립트
- ai/: AI 프롬프트, 정책, 평가 스크립트
- docs/: 프로젝트 문서(온보딩 포함)

2. 필수 사전 설치
- Git
- Node.js >= 20 (권장 최신 LTS 이상)
- pnpm (root에 명시된 버전 권장: pnpm@11.x)
- Docker Desktop — 로컬 인프라(Postgres :5434 · Redis :6381)를 컨테이너로 구동
  · 하이브리드 구동: DB/Redis만 Docker, 백엔드/관리자/스토어프런트는 호스트에서 네이티브 실행(사내 TLS 환경 대응)

3. 루트(워크스페이스) 의존성 설치
1) 루트로 이동
   cd C:\study\BbizProject-ver2
2) 워크스페이스 의존성 설치
   pnpm install -w
(윈도우에서 권한 문제가 생기면 PowerShell을 관리자 권한으로 실행)

4. 환경 변수(.env) 설정 — 템플릿 복사 후 채우기
- 앱별: `apps/admin/.env.example` → `.env.local`, `apps/web/.env.example` → `.env.local`
- 백엔드: `backend/services/api/.env.template` 참고하여 `backend/services/api/.env` 작성
  - DATABASE_URL=postgres://shop:<pw>@127.0.0.1:5434/shop
  - REDIS_URL=redis://127.0.0.1:6381
  - NODE_ENV=development
  - JWT_SECRET / COOKIE_SECRET=<랜덤 문자열>
- 스토어프런트(web)는 퍼블리셔블 키(`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...`)와 기본 리전(`NEXT_PUBLIC_DEFAULT_REGION=kr`) 필수

주의: 시크릿 값은 절대 커밋 금지(.gitignore 확인).

5. 데이터베이스 초기화, 마이그레이션, 시드
- Medusa 기반이라 backend/services/api/README.md와 Medusa Docs를 우선 참고
- 일반적인 흐름
  1) DB 생성 (Postgres에 데이터베이스 생성)
  2) .env의 DATABASE_URL 채우기
  3) 백엔드에서 medusa CLI로 개발 서버 실행하면 자동 마이그레이션/시드가 동작할 수 있음: pnpm dev (package.json의 medusa develop 실행)
- 문제가 생기면 backend README와 Medusa 공식 문서의 'migrations' 섹션 확인

6. 서비스 실행 (로컬 개발 권장 순서)
1) 백엔드
   cd backend\services\api
   pnpm dev
   - 이 스크립트는 medusa develop을 실행합니다. (백엔드: http://localhost:9000)
2) 스토어프런트 (web)
   cd apps\web
   pnpm dev
   - 기본 포트: 8000
3) 관리자 앱 (admin)
   cd apps\admin
   pnpm dev
   - 기본 포트: 7002

7. 테스트 명령
- 백엔드 유닛 테스트
  cd backend\services\api
  pnpm test:unit
- 통합 테스트
  pnpm test:integration:http
- 관리자 앱
  cd apps\admin
  pnpm test
- Playwright나 Vitest 설정은 각 package.json 참고

8. 코드 읽기 우선순위(추천)
1) backend/services/api/README.md (백엔드 전체 개요)
2) modules/*/*/README.md (도메인별 상세 설명)
3) apps/admin 및 apps/web의 주요 pages/components 진입점
4) packages/ui/* — 공통 컴포넌트

9. AI 관련(프로젝트에서의 역할과 사용법)
- 위치: ai/ (prompts, policies, evaluations 등)
- 사용 목적:
  - 문서 자동 생성/요약, 코드 변경 제안, 테스트 케이스 생성, PR 템플릿 자동화 등
- 기본 워크플로우:
  1) prompts/에 있는 템플릿을 확인
  2) 새로운 프롬프트를 작성하거나 템플릿으로 에이전트 작업 요청
  3) 생성 결과는 항상 사람이 리뷰(특히 보안/민감정보)해야 함
- 권장 규칙: 민감 정보는 프롬프트에 기입 금지. 출력된 코드/설정은 수동 검토 후 적용

10. 개발 규칙(간단)
- Style: ESLint/Prettier 설정 준수
- TypeScript 타입 엄격성 권장(가능하면 tsconfig 확인)
- 브랜치: feature/<이름> 또는 fix/<번호>-요약
- 커밋: 무엇을, 왜 변경했는지 간단히 기술
- PR: 변경 범위, 테스트 방법, 로컬에서 확인하는 방법 명시

11. 자주 발생하는 문제와 해결법
- 의존성 설치 실패: Node 버전 확인, pnpm 캐시 삭제(pnpm store prune), 다시 pnpm install -w
- 포트 충돌: netstat로 포트 확인 후 프로세스 종료 또는 포트 변경
- DB 연결 오류: DATABASE_URL 구문과 DB 서비스 상태 확인

12. 첫 이슈(권장 가이드)
- 문서 개선(PR): modules/*/README.md 중 한 곳을 골라 오타/불명확한 설명 수정
- 작은 UI 버그: apps/admin의 한 컴포넌트 스타일/텍스트 수정
- 백엔드 테스트 추가: backend/services/api의 단위 테스트 케이스 1개 추가

13. 유용한 파일/경로 모음
- backend/services/api/package.json
- apps/web/package.json
- apps/admin/package.json
- packages/ui/admin-prototype/README.md
- ai/prompts/README.md

14. 지원 요청 방식(팀의 관습)
- 이 저장소 내 docs/ 또는 모듈 README 먼저 검색
- 재현가능한 오류 로그(터미널 출력) 첨부하여 이슈 생성
- 도움 요청 시 환경(Windows/Node 버전/.env 내용(민감 데이터 제외)) 명시

마무리
- 이 온보딩은 실무에 빨리 투입되도록 주요 포인트를 모아둔 문서입니다. 더 상세한 환경 변수 목록, 스크린샷, 또는 특정 모듈 깊이 설명을 원하시면 요청해 주세요.

작성일: 2026-06-07
작성자: 자동 온보딩 생성기 (버전 2)