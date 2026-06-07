---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d3_상품관리
domain: 상품 관리
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d3_상품관리 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `products` + `product-variants` + `inventory` + `price-lists` 호출/래핑 + 갭B(고시·타임세일·통계·큐레이션) custom.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_상품목록 | 상품 목록 | list + export + 필터/노출제어 | 화면 | t001_상품목록.md | ../../unit_test/unit_014_상품목록.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t001_result.md | ../../../new-fe/{RUN_ID}/t001_raw.json | - |
| t002_상품등록 | 상품 등록 | create(기본정보/미디어/조직) | 화면 | t002_상품등록.md | ../../unit_test/unit_015_상품등록.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t002_result.md | ../../../new-fe/{RUN_ID}/t002_raw.json | - |
| t003_상품상세편집 | 상품 상세·편집 | detail/edit + media + organization(카테고리/컬렉션/태그) | 화면 | t003_상품상세편집.md | ../../unit_test/unit_016_상품상세편집.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t003_result.md | ../../../new-fe/{RUN_ID}/t003_raw.json | - |
| t004_상품일괄가져오기 | 상품 일괄 가져오기 | import(CSV) + export | 화면 | t004_상품일괄가져오기.md | ../../unit_test/unit_017_상품일괄가져오기.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t004_result.md | ../../../new-bo/{RUN_ID}/t004_raw.json | - |
| t005_옵션변형관리 | 옵션·변형 관리 | create-option/variant + SKU/바코드/가격 + manage-inventory-items | 화면 | t005_옵션변형관리.md | ../../unit_test/unit_018_옵션변형관리.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t005_result.md | ../../../new-fe/{RUN_ID}/t005_raw.json | - |
| t006_재고관리 | 재고 관리 | inventory list/detail + adjust(증감) + 동시성 원자차감/음수방지(갭B) | 화면 | t006_재고관리.md | ../../unit_test/unit_019_재고관리.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t006_result.md | ../../../new-bo/{RUN_ID}/t006_raw.json | - |
| t007_가격관리 | 가격 관리 | prices + price-lists(고객그룹/지역/기간 특가) | 화면 | t007_가격관리.md | ../../unit_test/unit_020_가격관리.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t007_result.md | ../../../new-fe/{RUN_ID}/t007_raw.json | - |
| t008_상품정보고시 | 상품정보고시·KC·원산지 | 카테고리별 고시 템플릿 + validation + versioning(갭B) | 화면 | t008_상품정보고시.md | ../../unit_test/unit_021_상품정보고시.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t008_result.md | ../../../new-bo/{RUN_ID}/t008_raw.json | - |
| t009_타임세일 | 타임세일 | 기간·재고 제한 + 종료 시 원가 복원 + 소진 자동종료(갭B) | 화면 | t009_타임세일.md | ../../unit_test/unit_022_타임세일.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t009_result.md | ../../../new-bo/{RUN_ID}/t009_raw.json | - |
| t010_상품통계큐레이션 | 상품통계·홈큐레이션 | 조회수/판매량/위시 + 인기검색어 + 베스트/신상품 섹션 + 금칙어(갭B) | 화면 | t010_상품통계큐레이션.md | ../../unit_test/unit_023_상품통계큐레이션.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t010_result.md | ../../../new-bo/{RUN_ID}/t010_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t003~t010 ← t002_상품등록(상품 존재 전제). t007_가격관리 ↔ d8_쿠폰프로모션(price-lists 공유). t006_재고관리 ↔ d6_배송관리(재고위치/할당). t002_상품등록 → 사용자 노출(스토어프론트, 본 DAG 밖).

## 작성 규칙 (양식 — 판정 기준)
- 필수 키: `dag_id, domain, status`
- 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/정의서/상품_01정의서.md`·`가격_06정의서.md`·`재고_05정의서.md`, `_archive/도메인설계/상품_카테고리_설계.md`·`서버사이드_고시검증_설계.md`.
