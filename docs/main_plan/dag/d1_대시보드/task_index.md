---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d1_대시보드
domain: 대시보드
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d1_대시보드 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `home`(dashboard 위젯) 호출/래핑 + 갭B(정산 KPI·경보) custom.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_대시보드위젯 | 대시보드 위젯 | 주문/매출/재고 KPI 위젯 조회 | 화면 | t001_대시보드위젯.md | ../../unit_test/unit_001_대시보드위젯.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t001_result.md | ../../../new-fe/{RUN_ID}/t001_raw.json | - |
| t002_정산KPI경보 | 정산 KPI·경보 | 정산 핵심지표 + 임계 경보(갭B) | 화면 | t002_정산KPI경보.md | ../../unit_test/unit_002_정산KPI경보.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t002_result.md | ../../../new-bo/{RUN_ID}/t002_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수. handback `status=OK` 만으로는 PASS 불가.

## 의존성
- t002_정산KPI경보 ← d7_정산관리 집계 산출 의존(정산 데이터 존재 전제). 초기엔 0건 빈 위젯 허용.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키: `dag_id, domain, status`
- 필수 표 헤더: `task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태` (row≥1)
- 검증: `task_id`/`task_spec`/`unit 문서` 열 필수, 선언 task ↔ task_spec ↔ unit_test 매핑 완성(orphan 0).

## 참고 (판정 제외)
- 흡수 원천: `_archive/도메인설계/관리자_설계.md`(대시보드 영역), `medusa_domain_feature_list_v1.1.md §2-1 #1 home`.
