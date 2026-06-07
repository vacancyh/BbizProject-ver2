---
doc_type: unit_test
dag_id: d2_주문관리
task_id: t003_배송처리
feature: 배송 처리(이행)
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t003_배송처리 배송 처리(이행)

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 이행 생성 + 재고 할당 | fulfillment 생성 + 재고 차감 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 송장 발송 + 상태 전이 | shipping 전이 + 송장 저장 + 알림 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 부분배송 | partially_delivered + 잔여 추적 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t003_배송처리.md §9` unit 매핑 일치.
