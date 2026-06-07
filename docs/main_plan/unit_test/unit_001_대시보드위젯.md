---
doc_type: unit_test
dag_id: d1_대시보드
task_id: t001_대시보드위젯
feature: 대시보드 위젯
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t001_대시보드위젯 대시보드 위젯

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 위젯 5종 로드 | 신규주문/매출/미발송/재고부족/신규회원 표시 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 기간 토글 재집계 | today/week/month 값 갱신 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t001_대시보드위젯.md §9` unit 매핑 일치.
