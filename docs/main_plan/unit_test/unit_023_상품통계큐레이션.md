---
doc_type: unit_test
dag_id: d3_상품관리
task_id: t010_상품통계큐레이션
feature: 상품통계·홈큐레이션
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t010_상품통계큐레이션 상품통계·홈큐레이션

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 상품 통계 집계 | 조회/판매/위시 집계 표시 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 큐레이션 섹션 구성 | 베스트/신상품 섹션 저장+스토어 반영 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 금칙어 필터 | 금칙어 검색어 노출 차단 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t010_상품통계큐레이션.md §9` 일치.
