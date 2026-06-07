---
doc_type: unit_test
dag_id: d13_엣지케이스
task_id: t008_쿠폰포인트경계
feature: 쿠폰·포인트 경계
created: 2026-06-03
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t008_쿠폰포인트경계 쿠폰·포인트 경계

## 판정 표 (row = 개별 엣지 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 만료/한도/조건 불충족 | 적용 거부 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 결제 중 쿠폰 만료 | rollback + 통지 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 1회용 쿠폰 동시사용 | UNIQUE 차단 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 4 | UT-004 | 환불 시 포인트 복원 | 음수 방지 절사 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 5 | UT-005 | 블랙리스트 pending 포인트 | 보류/반납 정책 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t008_쿠폰포인트경계.md §9` 일치.
