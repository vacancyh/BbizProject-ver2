---
doc_type: unit_test
dag_id: d12_마케팅
task_id: t003_카카오알림톡
feature: 카카오 알림톡
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t003_카카오알림톡 카카오 알림톡

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 이벤트 ON/OFF + 템플릿 발송 + SMS 대체 | 발송 실패 시 SMS fallback | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t003_카카오알림톡.md §9` 일치.
