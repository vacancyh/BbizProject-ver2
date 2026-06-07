---
doc_type: unit_test
dag_id: d5_회원관리
task_id: t003_관리자계정
feature: 관리자 계정·인증
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t003_관리자계정 관리자 계정·인증

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 로그인(로컬 prefill) | id/pw prefill 1클릭 로그인 + 세션 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 초대→수락→활성 | 초대 토큰 수락 후 로그인 가능 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 비번 초기화 토큰 검증 | 만료/위조 토큰 401 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t003_관리자계정.md §9` 일치. 로컬 prefill=shop CLAUDE.md DEV 룰.
