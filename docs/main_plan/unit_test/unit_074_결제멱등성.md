---
doc_type: unit_test
dag_id: d13_엣지케이스
task_id: t001_결제멱등성
feature: 결제 멱등성·중복결제
created: 2026-06-03
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t001_결제멱등성 결제 멱등성·중복결제

## 판정 표 (row = 개별 엣지 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 더블클릭/재시도 동일 idem-key | 1회만 승인 + 캐시 응답 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | webhook 중복 수신 | event_id dedup → 1회 반영 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | webhook 유실 | 일일 reconciliation 보정 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 4 | UT-004 | capture 전 refund / 초과 refund | 차단(409/400) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 5 | UT-005 | PG 응답 지연/실패 | pending 추적·재조회 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 6 | UT-006 | 결제 중 금액 변경 | 금액 락 불일치 거부 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t001_결제멱등성.md §9` 일치.
