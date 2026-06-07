---
doc_type: unit_test
dag_id: d3_상품관리
task_id: t006_재고관리
feature: 재고 관리
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t006_재고관리 재고 관리

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 재고 증감 조정 | 가용/예약 반영 + 이력 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 원자 차감 + 음수 방지 | 동시 차감 직렬화 + CHECK 409 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 대량 조정 충돌 처리 | 부분 실패 리포트 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t006_재고관리.md §9` 일치.
