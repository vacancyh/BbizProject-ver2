# 횡단(cross-cutting) 모듈 경계 설계 — RBAC · 감사로그 · 정책저장소

> 작성: 2026-06-01 (Phase 0) · 출처: `관리자_설계.md` §5 / `쇼핑몰_전용_QA_v4.md`(ADM-R·ADM-S)
> 이 3개는 **모든 도메인이 의존** → ② 도메인 루프에서 **가장 먼저 구현할 기반 도메인**(FEATURE_MATRIX §0 순서 0).
> Phase 0 산출 = 경계(폴더 스텁) + 본 설계. 전면 구현 X.

## 0. 공통 원칙 (가드레일)
- Medusa core(users/order/customer 등) **수정 금지**. core entity ↔ custom 모델 관계는 `src/links/*.ts`의 `defineLink`로 연결.
- 3모듈 모두 **Medusa module 패턴**(`backend/services/api/src/modules/<name>` — index.ts + service.ts + models/ + migrations/). 기존 `legal-kr/withdrawal-7day` 방식과 동일.
- 스텁 위치: `backend/services/api/src/modules/{rbac,audit,policy}` (index.ts + service.ts 경계만 생성됨).
- **medusa-config.ts 등록은 ② 루프 구현 시점에** (모델/migration 완성 후). 현재 미등록 → 백엔드 build 영향 없음.

## 1. RBAC (관리자 권한)
- **요구**: SUPER / OPERATION / CS / MARKETER 등급 + 메뉴별·기능별 **CRUD 2계층** 권한.
- **모델(설계)**: `Role`, `Permission(menu, action)`, `RolePermission(role_id, permission_id)`. user↔role = `src/links/user-role.ts`.
- **미들웨어**: `src/api/middlewares.ts`에서 `/admin/*` write 요청 진입 시 `rbac.checkPermission(userId, menu, action)` 호출 → 거부 시 403.
- **화면**: 설정 하위 "권한 관리" — 등급별 권한 매트릭스 토글.
- **연동점**: `users`(Medusa) 계정에 role 부여. 메뉴 정의 = `apps/admin/src/lib/nav/navigation.ts`.

## 2. 감사 로그 (audit)
- **요구**: 모든 write 액션 **append-only** 기록 + 5년 보관 + PII 마스킹.
- **모델(설계)**: `AuditLog(actor_id, action, target_type, target_id, diff_json, ip, created_at)`. UPDATE/DELETE 금지(append-only).
- **미들웨어**: write 응답 성공 후 `audit.record(entry)` (PostToolUse 성격). PII(전화/주소/주민번호)는 저장 전 마스킹.
- **화면**: 설정 하위 "감사 로그" — actor/기간/대상 필터 조회(읽기 전용).
- **보존**: 5년 만료분 아카이브 잡(`jobs/`).

## 3. 정책 저장소 (policy)
- **요구**: `system_policies` 통합 + 변경 시 **이중확인** + 변경이력(SUPER 전용) + 약관 관리.
- **모델(설계)**: `SystemPolicy(key, value_json, updated_by, updated_at)`, `PolicyHistory(policy_key, before, after, actor, at)`.
- **이중확인**: 변경 요청 → 확인 토큰 발급 → 재확인 시 commit. 변경은 `audit`에 자동 기록.
- **화면**: 설정 하위 "정책 관리" + "약관 관리". SUPER만 변경이력 열람.

## 4. 의존 관계 (구현 순서 근거)
```
RBAC  ─┐
audit ─┼─→ 모든 도메인 화면/액션이 권한검사 + 감사기록 + 정책참조에 의존
policy ┘
```
→ 그러므로 ② 루프 **0순위 = 기반(RBAC·감사·정책)**. 이후 주문→상품→… 진행.

## 5. ② 루프 인수인계 체크리스트
- [ ] 각 모듈 models/ + migrations 작성 → 실 DB 반영(`npx medusa db:migrate` 또는 컨테이너 build)
- [ ] `medusa-config.ts` modules에 `{ resolve: "./src/modules/rbac" }` 등 등록
- [ ] `src/links/`로 core entity 관계 정의
- [ ] `src/api/middlewares.ts`에 권한검사 + 감사기록 미들웨어 연결
- [ ] apps/admin 설정 화면에서 권한 매트릭스/감사조회/정책관리 UI 바인딩
