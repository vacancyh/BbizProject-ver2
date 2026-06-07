---
doc_type: unit_test
dag_id: d1_대시보드
task_id: t002_정산KPI경보
feature: 정산 KPI·경보
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t002_정산KPI경보 정산 KPI·경보

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 정산 KPI 집계 표시 | 매출/환불/PG수수료/순정산/보류 표시 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 임계 초과 경보 | 환불률/보류/지연 임계 초과 시 경보 노출 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t002_정산KPI경보.md §9` unit 매핑 일치.
