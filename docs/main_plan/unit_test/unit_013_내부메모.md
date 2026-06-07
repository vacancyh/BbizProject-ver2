---
doc_type: unit_test
dag_id: d2_주문관리
task_id: t011_내부메모
feature: 내부 메모
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t011_내부메모 내부 메모

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 메모 작성/조회 | append + 작성자/시각 표시, 고객 비노출 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 권한별 수정/삭제 | 타인 메모 삭제 403(본인/SUPER만) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t011_내부메모.md §9` unit 매핑 일치.
