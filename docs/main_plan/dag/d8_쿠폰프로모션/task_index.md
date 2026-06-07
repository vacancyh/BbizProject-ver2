---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d8_쿠폰프로모션
domain: 쿠폰·프로모션
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d8_쿠폰프로모션 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `promotions` + `campaigns` + `price-lists` 호출/래핑 + 갭B(한국식쿠폰·자동발급·포인트·이벤트) custom.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_프로모션 | 프로모션 | promotions list/create + edit-details/edit-rules + add-campaign | 화면 | t001_프로모션.md | ../../unit_test/unit_046_프로모션.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t001_result.md | ../../../new-fe/{RUN_ID}/t001_raw.json | - |
| t002_캠페인 | 캠페인 | campaigns list/create/edit + configuration + budget-edit + add-promotions | 화면 | t002_캠페인.md | ../../unit_test/unit_047_캠페인.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t002_result.md | ../../../new-fe/{RUN_ID}/t002_raw.json | - |
| t003_한국식쿠폰 | 한국식 쿠폰 | 정률/정액·최대할인·최소주문·대량발급(비동기)·자동발급·강제회수·취소복원(갭B) | 화면 | t003_한국식쿠폰.md | ../../unit_test/unit_048_한국식쿠폰.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t003_result.md | ../../../new-bo/{RUN_ID}/t003_raw.json | - |
| t004_회원등급가격 | 회원등급별 가격 | price-lists configuration(고객그룹/지역) → 멤버십 등급 특가(갭A) | 화면 | t004_회원등급가격.md | ../../unit_test/unit_049_회원등급가격.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t004_result.md | ../../../new-fe/{RUN_ID}/t004_raw.json | - |
| t005_포인트연동 | 포인트 연동 | 쿠폰/이벤트 ↔ 포인트 적립·사용 연동(갭B, d5 t005 cross) | API | t005_포인트연동.md | ../../unit_test/unit_050_포인트연동.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t005_result.md | ../../../new-bo/{RUN_ID}/t005_raw.json | - |
| t006_이벤트 | 이벤트 | 이벤트/캠페인 화면 + 우리 이벤트 쿠폰 매핑(갭B) | 화면 | t006_이벤트.md | ../../unit_test/unit_051_이벤트.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t006_result.md | ../../../new-fe/{RUN_ID}/t006_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t003_한국식쿠폰 ← t001_프로모션(promotion 래핑). t004_회원등급가격 ← d5 t004_멤버십등급 + d3 t007_가격관리(price-lists 공유). t005_포인트연동 ← d5 t005_포인트.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/정의서/프로모션_07정의서.md`·`가격_06정의서.md`, `_archive/도메인설계/쿠폰포인트_설계.md`·`엣지케이스/쿠폰포인트_엣지강화.md`.
