---
doc_type: unit_test
dag_id: d11_쇼핑몰설정
task_id: t011_감사로그
feature: 감사 로그
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t011_감사로그 감사 로그

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | write 액션 → 감사 append + 불변성 | 기록 생성 + 수정/삭제 거부 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | PII 마스킹 + 권한 조회 | 등급별 마스킹 + 비권한 403 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t011_감사로그.md §9` 일치. cross-cutting — 전 도메인 write 감사.
