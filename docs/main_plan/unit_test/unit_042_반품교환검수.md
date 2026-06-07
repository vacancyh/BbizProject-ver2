---
doc_type: unit_test
dag_id: d6_배송관리
task_id: t005_반품교환검수
feature: 반품·교환 검수
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t005_반품교환검수 반품·교환 검수

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 검수(양호/불량) 기록 | ReturnInspection insert(실 DB) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 환불방식/배송비 적용 | ReimbursementMethod 결정 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 완료/거절 + 알림 | 환불(d2 t007)/거절 + 자동 알림 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t005_반품교환검수.md §9` 일치. ★ 직전 세션 backend 라우트 구현분 검증.
