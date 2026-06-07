---
doc_type: unit_test
dag_id: d2_주문관리
task_id: t010_강제취소
feature: 강제 취소
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t010_강제취소 강제 취소

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 강제취소 원자성 | 재고복구+환불+알림 한 트랜잭션 성공 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 부분 실패 롤백 | PG 환불 실패 시 취소 무효(전체 롤백) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 권한/이중확인 | 비권한 403 + 사유 없으면 차단 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t010_강제취소.md §9` unit 매핑 일치. blocker=yes.
