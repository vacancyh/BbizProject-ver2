---
doc_type: unit_test
dag_id: d2_주문관리
task_id: t008_주문수정
feature: 주문 수정
created: 2026-06-02
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t008_주문수정 주문 수정

## 판정 표 (row = 기능 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 라인 수정 + version 증가 | OrderChange confirm + summary 재계산 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 배송지/이메일 수정 | 주소/이메일 갱신 | 화면 | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 발송 후 수정 차단 | shipping 이후 409 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t008_주문수정.md §9` unit 매핑 일치.
