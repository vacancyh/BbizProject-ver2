---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d9_리뷰문의
domain: 리뷰·문의
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d9_리뷰문의 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa core 無 → 전량 갭B custom(review/inquiry module).

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_리뷰관리 | 리뷰 관리 | 조회/숨김/복원 + 베스트리뷰 포인트 + 신고 처리(갭B) | 화면 | t001_리뷰관리.md | ../../unit_test/unit_052_리뷰관리.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t001_result.md | ../../../new-bo/{RUN_ID}/t001_raw.json | - |
| t002_상품QnA | 상품 Q&A | 상품 문의 조회/답변/숨김 + 미답변 필터(갭B) | 화면 | t002_상품QnA.md | ../../unit_test/unit_053_상품QnA.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t002_result.md | ../../../new-bo/{RUN_ID}/t002_raw.json | - |
| t003_1대1문의 | 1:1 문의 | CS 1:1 문의 조회/답변/상태 + 미답변 필터(갭B) | 화면 | t003_1대1문의.md | ../../unit_test/unit_054_1대1문의.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t003_result.md | ../../../new-bo/{RUN_ID}/t003_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t001~t003 ← d5_회원관리(작성 고객)·d3_상품관리(대상 상품). t001 베스트리뷰 포인트 ↔ d5 t005_포인트.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/도메인설계/리뷰문의_설계.md`·`엣지케이스/리뷰문의_엣지강화.md`.
