---
doc_type: unit_test
dag_id: d5_회원관리
task_id: t006_제재블랙리스트
feature: 제재·블랙리스트
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t006_제재블랙리스트 제재·블랙리스트

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 단계 제재 적용 | 경고→7→30→영구 단계 적용 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 진행주문 처리 연동 | 제재 시 d2 t010 강제취소 호출 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 만료/해제 이력 | 자동 만료 + 해제 이력 보존 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t006_제재블랙리스트.md §9` 일치.
