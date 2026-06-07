---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d4_카테고리
domain: 카테고리
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d4_카테고리 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `categories` + `collections` + `product-tags` + `product-types` 호출/래핑 + 갭B(slug 검증·캐시 무효화) custom.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_카테고리관리 | 카테고리 관리 | list/create/edit + organize(계층/순서) | 화면 | t001_카테고리관리.md | ../../unit_test/unit_024_카테고리관리.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t001_result.md | ../../../new-fe/{RUN_ID}/t001_raw.json | - |
| t002_카테고리상품연동 | 카테고리-상품 연동 | products 추가/제거 + 카테고리별 옵션 템플릿 | 화면 | t002_카테고리상품연동.md | ../../unit_test/unit_025_카테고리상품연동.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t002_result.md | ../../../new-fe/{RUN_ID}/t002_raw.json | - |
| t003_컬렉션기획전 | 컬렉션/기획전 | collections list/create/edit + add-products(갭A) | 화면 | t003_컬렉션기획전.md | ../../unit_test/unit_026_컬렉션기획전.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t003_result.md | ../../../new-fe/{RUN_ID}/t003_raw.json | - |
| t004_상품태그 | 상품 태그 | product-tags list/create/edit | 화면 | t004_상품태그.md | ../../unit_test/unit_027_상품태그.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t004_result.md | ../../../new-fe/{RUN_ID}/t004_raw.json | - |
| t005_상품유형 | 상품 유형 | product-types list/create/edit | 화면 | t005_상품유형.md | ../../unit_test/unit_028_상품유형.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t005_result.md | ../../../new-fe/{RUN_ID}/t005_raw.json | - |
| t006_slug검증캐시 | slug 검증·캐시 무효화 | slug 중복/형식 검증 + 변경 시 캐시 무효화(갭B) | API | t006_slug검증캐시.md | ../../unit_test/unit_029_slug검증캐시.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t006_result.md | ../../../new-bo/{RUN_ID}/t006_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t002_카테고리상품연동 ← t001_카테고리관리 + d3_상품관리(상품 존재). t006_slug검증캐시 = t001/t003 의 저장 경로에 cross-cutting.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/도메인설계/카테고리_상품연동_기획.md`·`카테고리_재설계.md`·`상품_카테고리_설계.md`, `_archive/정의서/상품_01정의서.md`.
