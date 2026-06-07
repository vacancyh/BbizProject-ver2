---
doc_type: unit_test
dag_id: d13_엣지케이스
task_id: t003_복합결제부분취소환불
feature: 복합결제 부분취소·환불
created: 2026-06-03
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t003_복합결제부분취소환불 복합결제 부분취소·환불

## 판정 표 (row = 개별 엣지 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 부분취소 비례배분 | 1원 단위 절사·배분 합=환불액 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 잔여<5만 무료배송 취소 | 배송비 재청구(F7)+고지 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 다중 트랜잭션(카드+계좌) | 비례 분할 환불 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 4 | UT-004 | 쿠폰/포인트 복원 | 취소비율 복원(중복복원 0) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 5 | UT-005 | 초과환불/계좌환불 분기 | 초과 차단·계좌환불 정산 동일 차감 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t003_복합결제부분취소환불.md §9` 일치.
