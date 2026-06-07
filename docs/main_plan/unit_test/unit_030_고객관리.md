---
doc_type: unit_test
dag_id: d5_회원관리
task_id: t001_고객관리
feature: 고객 관리
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t001_고객관리 고객 관리

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 고객 목록/검색 | 부분일치 검색 결과 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 상세 통합 뷰 + PII 마스킹 | 등급별 PII 마스킹 표시 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t001_고객관리.md §9` 일치.
