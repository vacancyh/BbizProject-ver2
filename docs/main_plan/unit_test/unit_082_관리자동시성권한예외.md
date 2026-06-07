---
doc_type: unit_test
dag_id: d13_엣지케이스
task_id: t009_관리자동시성권한예외
feature: 관리자 동시성·권한 예외
created: 2026-06-03
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t009_관리자동시성권한예외 관리자 동시성·권한 예외

## 판정 표 (row = 개별 엣지 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 관리자 2인 동시편집 | 낙관락 version 충돌 409 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 권한 외 접근 | RBAC 403 + 감사 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 이중확인 미수행 민감변경 | 저장 거부 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 4 | UT-004 | settlement 직접수정 | UPDATE 차단(UPSERT만) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 5 | UT-005 | 키/초대/webhook 위조 | revoke 401·만료 401·HMAC 거부 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t009_관리자동시성권한예외.md §9` 일치.
