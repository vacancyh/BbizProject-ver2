---
doc_type: unit_test
dag_id: d13_엣지케이스
task_id: t006_반품환불어뷰징
feature: 반품·환불 어뷰징
created: 2026-06-03
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t006_반품환불어뷰징 반품·환불 어뷰징

## 판정 표 (row = 개별 엣지 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | serial returner | 반품빈도 모니터링 → 리스크 상향 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | wardrobing/empty-box | 검수 보류·가치감소 거절 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | friendly fraud(미수령 주장) | 배송 증거 대조 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 4 | UT-004 | 차지백 발생 | 카드 자동 블랙리스트 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 5 | UT-005 | 브루트포스/반품토큰 | 3회 차단·토큰 1회용 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t006_반품환불어뷰징.md §9` 일치.
