---
doc_type: unit_test
dag_id: d2_주문관리
task_id: t007_환불
feature: 환불
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t007_환불 환불

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 전액 환불 | PG 환불 성공 + refunded + 정산 차감 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 부분환불 비례배분 | 쿠폰/포인트/배송비 1원 단위 안분 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 멱등키 중복 차단 | 동일 키 재요청 시 409 + 캐시 반환 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t007_환불.md §9` unit 매핑 일치. 반올림 정책(S0 Q4) 결정 후 #2 기대값 확정.
