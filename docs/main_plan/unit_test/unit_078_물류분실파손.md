---
doc_type: unit_test
dag_id: d13_엣지케이스
task_id: t005_물류분실파손
feature: 물류 분실·파손·오배송
created: 2026-06-03
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t005_물류분실파손 물류 분실·파손·오배송

## 판정 표 (row = 개별 엣지 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 배송지연 vs 분실 | 48~72h 대기 후 LOST 판정 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 파손 신고 | 증거요건(외箱/라벨/내부/다각도) 강제 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 오배송 | 회수+정배송 재발송 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 4 | UT-004 | 수령거부 | 회송+환불/재배송 분기 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 5 | UT-005 | 검수 양호/불량 혼재 | 라인별 분리(부분 환불) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t005_물류분실파손.md §9` 일치.
