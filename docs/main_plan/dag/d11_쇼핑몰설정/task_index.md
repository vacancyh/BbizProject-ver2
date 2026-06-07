---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d11_쇼핑몰설정
domain: 쇼핑몰 설정
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d11_쇼핑몰설정 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `store`+`regions`+`tax-regions`+`sales-channels`+`api-key-management`+`workflow-executions`+`return-reasons`/`refund-reasons` 호출/래핑 + 갭B(정책저장소·약관·점검·헬스·RBAC·감사) custom.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_스토어설정 | 스토어 설정 | store detail/edit + add-currencies + add-locales | 화면 | t001_스토어설정.md | ../../unit_test/unit_058_스토어설정.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t001_result.md | ../../../new-fe/{RUN_ID}/t001_raw.json | - |
| t002_지역세금 | 지역·세금 | regions + tax-regions(province/tax-rate/override) — 한국 VAT 10% | 화면 | t002_지역세금.md | ../../unit_test/unit_059_지역세금.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t002_result.md | ../../../new-fe/{RUN_ID}/t002_raw.json | - |
| t003_판매채널 | 판매채널 | sales-channels list/create/edit + add-products(단독몰=1채널 기본, 갭A) | 화면 | t003_판매채널.md | ../../unit_test/unit_060_판매채널.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t003_result.md | ../../../new-fe/{RUN_ID}/t003_raw.json | - |
| t004_API연동키 | API/연동 키 | api-key-management(Publishable/Secret) + sales-channels 연결(갭A) | 화면 | t004_API연동키.md | ../../unit_test/unit_061_API연동키.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t004_result.md | ../../../new-fe/{RUN_ID}/t004_raw.json | - |
| t005_워크플로우로그 | 워크플로우 로그 | workflow-executions list/detail(단계별 입출력/상태)(갭A) | 화면 | t005_워크플로우로그.md | ../../unit_test/unit_062_워크플로우로그.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t005_result.md | ../../../new-fe/{RUN_ID}/t005_raw.json | - |
| t006_반품환불사유 | 반품·환불 사유 | return-reasons + refund-reasons 코드 관리 | 화면 | t006_반품환불사유.md | ../../unit_test/unit_063_반품환불사유.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t006_result.md | ../../../new-fe/{RUN_ID}/t006_raw.json | - |
| t007_정책저장소 | 정책 저장소 | system_policies 통합 + 이중확인 + 변경이력(SUPER)(갭B) | 화면 | t007_정책저장소.md | ../../unit_test/unit_064_정책저장소.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t007_result.md | ../../../new-bo/{RUN_ID}/t007_raw.json | - |
| t008_약관관리 | 약관 관리 | 약관/방침 버전 관리 + 동의 연동(갭B) | 화면 | t008_약관관리.md | ../../unit_test/unit_065_약관관리.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t008_result.md | ../../../new-bo/{RUN_ID}/t008_raw.json | - |
| t009_점검모드헬스 | 점검모드·헬스 | 점검모드(scope) + 헬스(DB/Redis polling)(갭B) | 화면 | t009_점검모드헬스.md | ../../unit_test/unit_066_점검모드헬스.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t009_result.md | ../../../new-bo/{RUN_ID}/t009_raw.json | - |
| t010_RBAC권한 | RBAC 권한 | SUPER/OPERATION/CS/MARKETER 등급 + 메뉴별·기능별 CRUD 2계층(갭B) | 화면 | t010_RBAC권한.md | ../../unit_test/unit_067_RBAC권한.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t010_result.md | ../../../new-bo/{RUN_ID}/t010_raw.json | - |
| t011_감사로그 | 감사 로그 | 모든 write 액션 append-only + 5년 보관 + PII 마스킹(갭B) | 화면 | t011_감사로그.md | ../../unit_test/unit_068_감사로그.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t011_result.md | ../../../new-bo/{RUN_ID}/t011_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t010_RBAC권한 = blocker(전 메뉴 접근통제 진입점, d5 t003_관리자계정과 연결). FAIL 시 ABORT.
- t011_감사로그 = cross-cutting(전 도메인 write 액션 감사). t007/t008 ← t011(변경이력 감사 연동).

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/정의서/지역_11정의서.md`·`세금_10정의서.md`·`판매채널_12정의서.md`·`파일_16정의서.md`·`상태머신_19정의서.md`, `_archive/도메인설계/관리자_설계.md`, `_archive/도메인설계/검수/*`.
