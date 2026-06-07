---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d2_주문관리
domain: 주문 관리
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d2_주문관리 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `orders` 전 화면(list/export/detail/fulfillment/return/exchange/claim/refund/edit/transfer) 호출/래핑 + 갭B(강제취소·정산연동·내부메모) custom.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_주문목록조회 | 주문 목록·검색 | list + export + 필터/상태 검색 | 화면 | t001_주문목록조회.md | ../../unit_test/unit_003_주문목록조회.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t001_result.md | ../../../new-fe/{RUN_ID}/t001_raw.json | - |
| t002_주문상세 | 주문 상세 | detail(상품/결제/배송/이력) | 화면 | t002_주문상세.md | ../../unit_test/unit_004_주문상세.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t002_result.md | ../../../new-fe/{RUN_ID}/t002_raw.json | - |
| t003_배송처리 | 배송 처리(이행) | create-fulfillment + allocate-items + create-shipment(송장) | 화면 | t003_배송처리.md | ../../unit_test/unit_005_배송처리.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t003_result.md | ../../../new-bo/{RUN_ID}/t003_raw.json | - |
| t004_반품접수 | 반품 접수 | create-return + receive-return | 화면 | t004_반품접수.md | ../../unit_test/unit_006_반품접수.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t004_result.md | ../../../new-bo/{RUN_ID}/t004_raw.json | - |
| t005_교환 | 교환 | create-exchange + 차액 결제 | 화면 | t005_교환.md | ../../unit_test/unit_007_교환.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t005_result.md | ../../../new-bo/{RUN_ID}/t005_raw.json | - |
| t006_클레임 | 클레임 | create-claim(불량/오배송 보상) | 화면 | t006_클레임.md | ../../unit_test/unit_008_클레임.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t006_result.md | ../../../new-bo/{RUN_ID}/t006_raw.json | - |
| t007_환불 | 환불 | create-refund(전액/부분/Pro-rata) | 화면 | t007_환불.md | ../../unit_test/unit_009_환불.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t007_result.md | ../../../new-bo/{RUN_ID}/t007_raw.json | - |
| t008_주문수정 | 주문 수정 | create-edit + edit-email/배송지/청구지 | 화면 | t008_주문수정.md | ../../unit_test/unit_010_주문수정.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t008_result.md | ../../../new-fe/{RUN_ID}/t008_raw.json | - |
| t009_수기주문생성 | 수기 주문 생성 | draft order(전화/CS 주문) | 화면 | t009_수기주문생성.md | ../../unit_test/unit_011_수기주문생성.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t009_result.md | ../../../new-fe/{RUN_ID}/t009_raw.json | - |
| t010_강제취소 | 강제 취소 | 관리자 강제취소 + 진행중 주문 처리(갭B) | 화면 | t010_강제취소.md | ../../unit_test/unit_012_강제취소.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t010_result.md | ../../../new-bo/{RUN_ID}/t010_raw.json | - |
| t011_내부메모 | 내부 메모 | 주문 내부메모 + metadata(갭B) | 화면 | t011_내부메모.md | ../../unit_test/unit_013_내부메모.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t011_result.md | ../../../new-fe/{RUN_ID}/t011_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t003~t011 ← t002_주문상세(주문 존재 전제). t004~t007(반품/교환/클레임/환불) ← t003 배송처리 후 또는 결제 존재 시. t007_환불 ↔ d7_정산관리(정산 차감 연동).
- t010_강제취소 = blocker 성격(진행중 주문/결제 무결성). FAIL 시 cycle ABORT + main 보고.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키: `dag_id, domain, status`
- 필수 표 헤더: `task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태` (row≥1)
- 검증: orphan 0(선언 task ↔ task_spec ↔ unit_test 매핑 완성).

## 참고 (판정 제외)
- 흡수 원천: `_archive/정의서/주문_02정의서.md`, `_archive/도메인설계/주문_설계.md`, `_archive/도메인설계/엣지케이스/주문_엣지강화.md`, `_archive/이식설계/벤듀어_상태머신_이식.md`, `_archive/이식설계/스프리_RMA_이식.md`.
- 결제 day-1 필수(멱등키/Webhook dedup/Pro-rata 부분환불/LIFO 보상) = t007_환불 spec 반영.
