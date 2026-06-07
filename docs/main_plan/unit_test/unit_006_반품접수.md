---
doc_type: unit_test
dag_id: d2_주문관리
task_id: t004_반품접수
feature: 반품 접수
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t004_반품접수 반품 접수

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 반품 접수(requested) | Return 생성 + 사유/배송비부담 기록 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 수령 처리(received) | received 전이 + 검수 대기 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 동일 라인 반품 중복 차단 | 409 LINE_ALREADY_IN_PROCESS | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t004_반품접수.md §9` unit 매핑 일치.
