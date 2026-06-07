---
doc_type: unit_test
dag_id: d13_엣지케이스
task_id: t004_청약철회정책경계
feature: 청약철회 정책 경계
created: 2026-06-03
status_self: null
status_raw: null
lie_flag: null
local_pass: null
ci_pass: null
evidence_sha256: null
retry_count: 0
---

# 단위테스트 — t004_청약철회정책경계 청약철회 정책 경계

## 판정 표 (row = 개별 엣지 케이스)

| seq | test_id | 기능(케이스) | 기대 결과(통과 기준) | 증적유형 | 증적경로 | 자기보고(1차) | raw진실(2차) | 거짓말 |
|----:|---------|------------|--------------------|---------|---------|:--------:|:--------:|:----:|
| 1 | UT-001 | 7일 기산점·기한 판정 | 배송완료일 기준 적법성 판정 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 2 | UT-002 | 사유별 배송비 부담주체 | 단순변심=소비자/불량=사업자 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 3 | UT-003 | 위약금/취소수수료 청구 | 차단(법 §18) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 4 | UT-004 | 사용·소비로 가치감소 | 철회 불가(수동검수) | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |
| 5 | UT-005 | 3영업일 환불 초과 | 지연이자 hook + 경보 | API | _(agent)_ | _(agent)_ | _(script)_ | _(script)_ |

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 판정 표 row≥1 + strict O/X.

## 참고 (판정 제외)
- task_spec `t004_청약철회정책경계.md §9` 일치.
