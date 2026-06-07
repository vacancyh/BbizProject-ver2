---
doc_type: unit_test
dag_id: d11_쇼핑몰설정
task_id: t010_RBAC권한
feature: RBAC 권한
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t010_RBAC권한 RBAC 권한

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 역할별 메뉴·CRUD 게이트(허용/차단) | 권한 비트별 허용/403 정합 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 역할 부여(d5 t003) 즉시 반영 | 부여 직후 접근권 변경 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t010_RBAC권한.md §9` 일치. blocker — FAIL 시 ABORT.
