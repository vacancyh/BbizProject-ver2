# [갭 문서] 관리자 권한(RBAC)

> 상태: **DONE** (② 도메인 루프 0순위 — 기반 도메인). FEATURE_MATRIX §4 1행.

## 1. 분류
- **갭유형**: GAP_B (우리 要求有 · Medusa core 無)
- **도메인**: 기반(횡단)
- **우리 메뉴 위치**: 기반·권한 → 권한 관리(`/permissions`)
- **FEATURE_MATRIX 행**: §4 "관리자 권한(RBAC)"

## 2. 기능 설명
SUPER / OPERATION / CS / MARKETER 4등급 + 메뉴별·기능별 CRUD 2계층 권한. 운영자가 등급별 메뉴 권한 매트릭스를 토글하고, 관리자 계정에 등급을 부여한다. `/admin/*` write 요청은 미들웨어가 등급 권한을 검사해 거부 시 403. **읽기(GET)도 보안 메뉴(권한·정책·감사로그)는 super 전용으로 제한**된다(미들웨어 read 검사). 점검모드(`/admin/ops/maintenance`) 등 일부 기능은 **명시적 super 역할**이 필요(역할 미할당 계정은 부여 필요).

## 3. 필요 데이터
- `rbac_role`(key/name/description/is_system) · `rbac_role_permission`(role_key/menu_id/can_read|create|update|delete) · `rbac_user_role`(user_id/role_key).
- Medusa `user`(core)는 query.graph 로 읽기만, user_id 는 text 보관(core 미수정).
- menu_id = `apps/admin/src/lib/nav/navigation.ts` NavItem.id (+ 기반 메뉴 3종).

## 4. Medusa API 여부
- **REST `/admin/*`**: RBAC 자체는 Medusa에 없음.
- **결론**: **MODULE**(custom) — `backend/services/api/src/modules/rbac`. 미들웨어는 `src/api/middlewares.ts`.

## 5. 우리 화면 설계 (구현됨)
- PageHeader(GapBadge "메두사기능없음") → 등급 선택 탭(운영/고객지원/마케터) → 메뉴×CRUD 체크박스 매트릭스 → 관리자 등급 부여 DataTable(+ ConfirmModal 이중확인).
- 부트스트랩: 미지정/super = 전체 허용(마이그레이션 중 잠금 방지).

## 6. 구현 결과
- [x] BE: `modules/rbac`(models 3 + service + migration) + `medusa-config.ts` 등록 + `src/api/admin/rbac/*` + `src/api/middlewares.ts` 권한검사
- [x] FE: `apps/admin/src/app/(admin)/permissions/page.tsx` + `lib/api/rbac.ts`
- [x] 검증: typecheck/build + Playwright 실 DB 렌더 + 등급 부여(rbac_user_role) + **operation 차단 403 실측**
- [x] FEATURE_MATRIX §4 1행 DONE
