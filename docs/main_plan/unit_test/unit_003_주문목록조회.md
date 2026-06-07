---
doc_type: unit_test
dag_id: d2_주문관리
task_id: t001_주문목록조회
feature: 주문 목록·검색
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t001_주문목록조회 주문 목록·검색

> task = 기능 1개. 실제 기능을 돌려 증적을 남긴다.

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 주문 목록 로드 + 페이지네이션 | 1페이지 + 총건수 표시 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 상태/기간 필터 | 조건 일치 행만 표시 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | CSV export | 현재 필터 기준 CSV 다운로드 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

- 증적경로 예) `new-fe/evidence/t001/UT-001_trace.zip`

## 작성 규칙 (양식 — 판정 기준)
- 필수 키: `dag_id, task_id, feature, status_self, status_raw, lie_flag`
- 판정 표 row≥1, 판정 컬럼 strict O/X. `raw진실(2차)`·`거짓말` = 스크립트 전용.

## 참고 (판정 제외)
- task_spec `t001_주문목록조회.md §9` unit 매핑과 UT-id 일치.
