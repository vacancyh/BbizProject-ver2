---
doc_type: unit_test
dag_id: d13_엣지케이스
task_id: t007_상태머신전이가드
feature: 상태머신 전이 가드
created: 2026-06-03
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t007_상태머신전이가드 상태머신 전이 가드

## 판정 표 (row = 개별 엣지 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | Cancelled→Shipped 직접 전이 | FSM 가드 차단(409) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | Delivered→Cancelled(철회 미경유) | 차단 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 전이 중 오류 | onError rollback | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 4 | UT-004 | 부분 이행 | PartiallyShipped만 허용 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 5 | UT-005 | cancelled return/claim 재처리 | irreversible 차단 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t007_상태머신전이가드.md §9` 일치.
