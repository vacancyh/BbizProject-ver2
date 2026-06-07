# [갭 문서] 정책 저장소(policy)

> 상태: **DONE** (② 도메인 루프 0순위 — 기반 도메인). FEATURE_MATRIX §4 3행.

## 1. 분류
- **갭유형**: GAP_B (우리 要求有 · Medusa core 無)
- **도메인**: 기반(횡단)
- **우리 메뉴 위치**: 기반·권한 → 정책 관리(`/policies`)
- **FEATURE_MATRIX 행**: §4 "정책 저장소"

## 2. 기능 설명
운영 정책(미입금 자동취소·환불 SLA·청약철회 기간·적립금 유효기간·세션 만료·점검 모드 등)을 단일 저장소로 통합. 변경 시 이중확인(confirm) 필수 + 변경 전/후 이력 적재 + 감사 로그 기록. 분류별 그룹 표시.

## 3. 필요 데이터
- `system_policy`(key/label/category/value(jsonb)/value_type/description/updated_by) · `policy_history`(policy_key/before/after/actor_id/actor_email/created_at, append-only).

## 4. Medusa API 여부
- **REST `/admin/*`**: 통합 정책 저장소 없음(store 설정 일부만).
- **결론**: **MODULE**(custom) — `backend/services/api/src/modules/policy`. 변경 엔드포인트 `src/api/admin/policy/policies/[key]`.

## 5. 우리 화면 설계 (구현됨)
- PageHeader(GapBadge) → 분류별 테이블(정책/값/설명/관리) → 값 입력(number/text/boolean) → "변경" 시 ConfirmModal(이중확인) → "이력" 시 DetailDrawer(before→after 타임라인).
- 이중확인: FE ConfirmModal 재확인 → BE `confirm=true` 필수(누락 시 409).

## 6. 구현 결과
- [x] BE: `modules/policy`(models 2 + service + seed + migration) + `medusa-config.ts` 등록 + `src/api/admin/policy/*`
- [x] FE: `apps/admin/src/app/(admin)/policies/page.tsx` + `lib/api/policy.ts`
- [x] 검증: typecheck/build + Playwright 실 DB 렌더(6 정책) + 변경(72→48, policy_history 적재) + **이중확인 누락 409 실측**
- [x] FEATURE_MATRIX §4 3행 DONE
