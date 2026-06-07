---
doc_type: unit_test
dag_id: d3_상품관리
task_id: t008_상품정보고시
feature: 상품정보고시·KC·원산지
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t008_상품정보고시 상품정보고시·KC·원산지

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 카테고리별 고시 템플릿 + 검증 | 필수 항목 입력 검증 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 고시 versioning | 변경 시 버전+1 이력 보존 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 고시 누락 노출 차단 | 필수 누락 시 노출 ON 거부 422 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t008_상품정보고시.md §9` 일치.
