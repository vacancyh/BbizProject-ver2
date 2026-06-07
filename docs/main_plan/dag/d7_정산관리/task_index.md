---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d7_정산관리
domain: 정산 관리
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d7_정산관리 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `payment`(원장) 호출/래핑 + 갭B(settlement 전체) custom module.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_결제원장 | 결제 원장 | PaymentCollection→Session→Payment 흐름 + 환불 이력 조회 | 화면 | t001_결제원장.md | ../../unit_test/unit_043_결제원장.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t001_result.md | ../../../new-bo/{RUN_ID}/t001_raw.json | - |
| t002_정산집계 | 정산 집계 | 일/월 매출·환불·PG수수료·순정산 + 날짜경계 귀속 + 부분취소 차감(갭B) | 화면 | t002_정산집계.md | ../../unit_test/unit_044_정산집계.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t002_result.md | ../../../new-bo/{RUN_ID}/t002_raw.json | - |
| t003_정산엑셀 | 정산 엑셀 | 정산 결과 엑셀 다운로드/리포트(갭B) | 화면 | t003_정산엑셀.md | ../../unit_test/unit_045_정산엑셀.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t003_result.md | ../../../new-bo/{RUN_ID}/t003_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t002_정산집계 ← t001_결제원장 + d2_주문관리 t007_환불(부분취소/환불 차감). t003 ← t002. d1_대시보드 t002_정산KPI경보 ← t002 산출 의존.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/정의서/결제_09정의서.md`·`세금_10정의서.md`, `_archive/도메인설계/결제_설계.md`·`엣지케이스/결제_엣지강화.md`.
- day-1 필수(멱등키/Webhook dedup/Pro-rata 부분환불/LIFO 보상) = t001/t002 spec 반영. Multi-PG·Circuit breaker·CDC = P2 미룸.
