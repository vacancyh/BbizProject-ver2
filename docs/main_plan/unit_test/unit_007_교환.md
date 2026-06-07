---
doc_type: unit_test
dag_id: d2_주문관리
task_id: t005_교환
feature: 교환
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t005_교환 교환

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 단건 교환 생성 | Exchange 생성 + 회수 운송장 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 다건 그룹 + 1회 회수 | exchange_group 묶음 + 단일 회수 송장 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 차액 추가결제/환불 | 차액 부호별 결제/환불 처리 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t005_교환.md §9` unit 매핑 일치.
