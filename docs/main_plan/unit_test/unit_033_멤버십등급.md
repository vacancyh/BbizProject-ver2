---
doc_type: unit_test
dag_id: d5_회원관리
task_id: t004_멤버십등급
feature: 멤버십 등급
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t004_멤버십등급 멤버십 등급

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 구매금액 자동 승급 | 구간 도달 시 등급 상승 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 등급별 적립률/쿠폰 부여 | 등급 혜택 적용 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 연초 리셋 멱등 | 중복 실행 시 1회만 리셋 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t004_멤버십등급.md §9` 일치.
