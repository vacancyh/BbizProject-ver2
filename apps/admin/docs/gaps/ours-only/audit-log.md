# [갭 문서] 감사 로그(audit)

> 상태: **DONE** (② 도메인 루프 0순위 — 기반 도메인). FEATURE_MATRIX §4 2행.

## 1. 분류
- **갭유형**: GAP_B (우리 要求有 · Medusa core 無)
- **도메인**: 기반(횡단)
- **우리 메뉴 위치**: 기반·권한 → 감사 로그(`/audit-logs`)
- **FEATURE_MATRIX 행**: §4 "감사 로그"

## 2. 기능 설명
모든 write 액션(POST/PUT/PATCH/DELETE)을 append-only 로 기록. 행위자·메서드·경로·상태코드·변경본문(diff)·IP·시각 보관. PII(전화/주민번호/이메일/주소)는 저장 전 마스킹. 조회는 읽기 전용(actor/메서드/기간 필터 + 페이지네이션).

## 3. 필요 데이터
- `audit_log`(actor_id/actor_email/action/method/path/target_type/target_id/status_code/diff(jsonb)/ip/created_at).
- append-only: service 가 update/delete 래퍼 미노출. 5년 보관 만료 아카이브는 후속 jobs.

## 4. Medusa API 여부
- **REST `/admin/*`**: 통합 감사 로그 없음(Medusa는 일부 이벤트만).
- **결론**: **MODULE**(custom) — `backend/services/api/src/modules/audit`. 기록은 `src/api/middlewares.ts`(2xx write 시 `res.on('finish')`).

## 5. 우리 화면 설계 (구현됨)
- PageHeader(GapBadge) → FilterBar(메서드 필터) → DataTable(시각/행위자/메서드/액션/경로/상태) → Pagination.
- 메서드 배지 색상(POST=성공/PUT·PATCH=경고/DELETE=위험).

## 6. 구현 결과
- [x] BE: `modules/audit`(model + service + migration + utils/mask-pii) + `medusa-config.ts` 등록 + `src/api/admin/audit/logs` + 미들웨어 기록
- [x] FE: `apps/admin/src/app/(admin)/audit-logs/page.tsx` + `lib/api/audit.ts`
- [x] 검증: typecheck/build + Playwright 실 DB 렌더(4건) + **이메일 PII 마스킹 실측**(`s**@local.test`)
- [x] FEATURE_MATRIX §4 2행 DONE
