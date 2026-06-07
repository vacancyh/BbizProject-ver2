---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d6_배송관리
domain: 배송 관리
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d6_배송관리 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `locations`/`stock-location` + `shipping-profiles`/`shipping-option-types`/service-zone + `fulfillment` 호출/래핑 + 갭B(국내택배·운송장CSV·반품검수) custom(rma-extension 활용).

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_출고지창고 | 출고지/창고 | locations list/create/edit + sales-channels 할당 + fulfillment-providers(갭A) | 화면 | t001_출고지창고.md | ../../unit_test/unit_038_출고지창고.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t001_result.md | ../../../new-fe/{RUN_ID}/t001_raw.json | - |
| t002_배송정책 | 배송 정책 | shipping-profiles + option-types + service-zone(지역별/금액별 배송비) | 화면 | t002_배송정책.md | ../../unit_test/unit_039_배송정책.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t002_result.md | ../../../new-fe/{RUN_ID}/t002_raw.json | - |
| t003_국내택배연동 | 국내 택배 연동 | 국내 택배사(CJ·우체국 등) + 기본택배사 설정(갭B) | 화면 | t003_국내택배연동.md | ../../unit_test/unit_040_국내택배연동.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t003_result.md | ../../../new-bo/{RUN_ID}/t003_raw.json | - |
| t004_운송장CSV일괄 | 운송장 CSV 일괄 | 운송장 번호 CSV 일괄 등록·발송 처리(갭B) | 화면 | t004_운송장CSV일괄.md | ../../unit_test/unit_041_운송장CSV일괄.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t004_result.md | ../../../new-bo/{RUN_ID}/t004_raw.json | - |
| t005_반품교환검수 | 반품·교환 검수 | 신청→수거→검수(양호/불량)→완료/거절 + 자동알림 + 교환 차액(갭B, rma-extension) | 화면 | t005_반품교환검수.md | ../../unit_test/unit_042_반품교환검수.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t005_result.md | ../../../new-bo/{RUN_ID}/t005_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t002_배송정책 ← t001_출고지창고(창고/서비스존 존재). t003/t004 ← d2_주문관리 t003_배송처리(이행 연동). t005_반품교환검수 ← d2 t004_반품접수/t005_교환(반품 모델 존재).
- t005 = 직전 세션 backend 라우트(rma policy/reimbursement/shipping-fee/inspection) 구현 완료분과 직접 연결.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/정의서/배송이행_08정의서.md`·`재고위치_13정의서.md`·`RMA확장_18정의서.md`·`청약철회7일_17정의서.md`, `_archive/도메인설계/배송_설계.md`·`엣지케이스/배송_엣지강화.md`, `_archive/이식설계/스프리_RMA_이식.md`.
