---
doc_type: unit_test
dag_id: d6_배송관리
task_id: t004_운송장CSV일괄
feature: 운송장 CSV 일괄
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t004_운송장CSV일괄 운송장 CSV 일괄

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | CSV 매칭·검증 | 주문 매칭 + 미매칭 리포트 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 일괄 발송(부분 성공) | 매칭 행 shipping + 리포트 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t004_운송장CSV일괄.md §9` 일치.
