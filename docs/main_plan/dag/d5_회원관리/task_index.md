---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d5_회원관리
domain: 회원 관리
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d5_회원관리 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `customers` + `customer-groups` + `users`/`auth`(login/reset-password/invite) 호출/래핑 + 갭B(멤버십·포인트·제재·세금계산서·동의이력) custom.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_고객관리 | 고객 관리 | customers list/create/detail(주문이력/주소)/edit | 화면 | t001_고객관리.md | ../../unit_test/unit_030_고객관리.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t001_result.md | ../../../new-fe/{RUN_ID}/t001_raw.json | - |
| t002_고객그룹 | 고객 그룹 | customer-groups list/create/edit + add-customers | 화면 | t002_고객그룹.md | ../../unit_test/unit_031_고객그룹.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t002_result.md | ../../../new-fe/{RUN_ID}/t002_raw.json | - |
| t003_관리자계정 | 관리자 계정·인증 | users list/invite/edit(역할/활성) + login/reset-password/invite 수락 | 화면 | t003_관리자계정.md | ../../unit_test/unit_032_관리자계정.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t003_result.md | ../../../new-bo/{RUN_ID}/t003_raw.json | - |
| t004_멤버십등급 | 멤버십 등급 | 구매금액 자동 등급(일반/실버/골드/VIP) + 등급별 적립률·쿠폰 + 연초 리셋(갭B) | 화면 | t004_멤버십등급.md | ../../unit_test/unit_033_멤버십등급.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t004_result.md | ../../../new-bo/{RUN_ID}/t004_raw.json | - |
| t005_포인트 | 포인트 | 가입/구매/리뷰/추천/출석 적립·사용·소멸 + 유효기간 + D-N 알림(갭B) | 화면 | t005_포인트.md | ../../unit_test/unit_034_포인트.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t005_result.md | ../../../new-bo/{RUN_ID}/t005_raw.json | - |
| t006_제재블랙리스트 | 제재·블랙리스트 | 단계 제재(경고→7→30→영구) + 사유분류 + 진행중 주문 처리(갭B) | 화면 | t006_제재블랙리스트.md | ../../unit_test/unit_035_제재블랙리스트.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t006_result.md | ../../../new-bo/{RUN_ID}/t006_raw.json | - |
| t007_세금계산서 | 세금계산서 | 사업자 전자세금계산서 신청·발급·정정·취소(현금영수증 제외, 갭B) | 화면 | t007_세금계산서.md | ../../unit_test/unit_036_세금계산서.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t007_result.md | ../../../new-bo/{RUN_ID}/t007_raw.json | - |
| t008_동의이력 | 동의 이력 | 마케팅/약관 동의 수집·철회 이력 + 2년 재확인(갭B) | 화면 | t008_동의이력.md | ../../unit_test/unit_037_동의이력.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t008_result.md | ../../../new-bo/{RUN_ID}/t008_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t004~t008 ← t001_고객관리(고객 존재 전제). t004_멤버십등급 ↔ d8(등급별 쿠폰/가격). t005_포인트 ↔ d8(포인트 연동)·d12(D-N 알림). t007 ↔ d7_정산관리.
- t003_관리자계정 = blocker 성격(인증/RBAC 진입점, d11 RBAC 와 연결). FAIL 시 ABORT.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/정의서/고객_04정의서.md`·`사용자인증_14정의서.md`, `_archive/도메인설계/회원_설계.md`·`관리자_설계.md`, `_archive/도메인설계/엣지케이스/회원_엣지강화.md`.
- 로컬 admin 자동로그인 prefill(id=admin) = CLAUDE.md DEV 룰. t003 spec 에 명시.
