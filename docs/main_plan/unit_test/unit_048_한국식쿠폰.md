---
doc_type: unit_test
dag_id: d8_쿠폰프로모션
task_id: t003_한국식쿠폰
feature: 한국식 쿠폰
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t003_한국식쿠폰 한국식 쿠폰

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 정률/정액 + 최대할인/최소주문 | 조건 기반 할인 정합 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 대량 발급(비동기) | job 멱등 + 발급 리포트 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 강제 회수 / 취소 복원 | 회수/주문취소 복원(d2) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t003_한국식쿠폰.md §9` 일치.
