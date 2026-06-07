---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d10_통계리포트
domain: 통계·리포트
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d10_통계리포트 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `orders`/`products` 집계 호출/래핑 + 갭B(매출리포트 자동발송) custom.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_매출통계 | 매출 통계 | 기간별 매출/주문/환불 집계 + 추이 차트 | 화면 | t001_매출통계.md | ../../unit_test/unit_055_매출통계.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t001_result.md | ../../../new-bo/{RUN_ID}/t001_raw.json | - |
| t002_상품통계 | 상품 통계 | 상품별 판매량/조회수/전환 집계 + 베스트 랭킹 | 화면 | t002_상품통계.md | ../../unit_test/unit_056_상품통계.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t002_result.md | ../../../new-bo/{RUN_ID}/t002_raw.json | - |
| t003_리포트자동발송 | 리포트 자동발송 | 일/주/월 매출리포트 스케줄 자동발송(갭B) | 배치 | t003_리포트자동발송.md | ../../unit_test/unit_057_리포트자동발송.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t003_result.md | ../../../new-bo/{RUN_ID}/t003_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t001/t002 ← d2_주문관리·d3_상품관리(원천 데이터). t003 ← t001/t002 + d12_마케팅(이메일 발송 채널).

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/정의서/주문_02정의서.md`·`상품_01정의서.md`, `_archive/도메인설계/관리자_설계.md`(통계 영역).
