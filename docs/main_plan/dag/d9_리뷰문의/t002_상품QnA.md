---
doc_type: task_spec
schema_version: v2.6
status: ready
dag_id: d9_리뷰문의
task_id: t002_상품QnA
feature: 상품 Q&A
surface: 화면
owner: main
target_agent: new-bo
unit_doc: ../../unit_test/unit_053_상품QnA.md
qa_doc: ../../qa/qa_009_리뷰문의.md
created: 2026-06-02
---

# 기능 상세명세 — t002 상품 Q&A (갭B)

> Medusa core 無 → 커스텀(inquiry module). 상품 문의 조회/답변/숨김 + 미답변 필터.

## 1. 기능 목적
- 상품별 고객 문의를 조회·답변·숨김 처리한다. 미답변 필터로 CS SLA 관리. 비밀글 처리.

## 2. 사용자 흐름

| step | 사용자 행동 | 시스템 반응 | 화면/상태 | 성공 기준 |
|--:|---|---|---|---|
| 1 | Q&A 목록(미답변 필터) | 문의 표시 | 목록 | 미답변 우선 |
| 2 | 답변 작성 | 답변 등록 + 알림 | 답변됨 | 고객 알림 |
| 3 | 숨김/비밀글 | 노출 제어 | 갱신 | - |

## 3. 화면/상태 정의

| state_id | 상태명 | 진입 조건 | 표시 요소 | 금지/예외 |
|---|---|---|---|---|
| S1 | 문의 목록 | 진입 | 상품·문의·답변여부·비밀 | - |

## 4. 입력/검증 규칙

| input_id | 입력값 | 필수 | 검증 규칙 | 실패 메시지 |
|---|---|:--:|---|---|
| I1 | 답변 내용 | Y | 1~2000자 | 답변 필수 |

## 5. 액션/버튼/이벤트

| action_id | 트리거 | 기대 동작 | API | 성공 결과 | 실패 결과 |
|---|---|---|---|---|---|
| A1 | 답변 | 답변 등록 + 알림 | POST /admin/inquiries/:id/answer | 답변됨 | 400 |
| A2 | 숨김 | 노출 제어 | POST /admin/inquiries/:id/hide | 반영 | 400 |

## 6. API 영향

| api_id | method | path | request | response | error |
|---|---|---|---|---|---|
| API1 | GET | /admin/inquiries | filter(answered) | 200 inquiries[] | 400 |

## 7. DB 영향

| table | action | field | before | after | 비고 |
|---|---|---|---|---|---|
| inquiry(커스텀) | update | answer, status | open | answered/hidden | inquiry module |

## 8. 보안/예외 조건

| case_id | 조건 | 기대 처리 | 증적 |
|---|---|---|---|
| C1 | 비밀글 노출 | 작성자/관리자만 | 감사로그 |

## 9. unit 매핑

| unit_id | 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| UT-001 | 미답변 필터 + 답변 | unit_053 #1 | O |

## 10. QA 매핑

| qa_id | 연계 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| QA-002 | 문의 → 답변 → 알림(d12) | qa_009 #2 | O |

## 11. 증적 요구사항

| evidence_id | 필요한 증적 | 파일 유형 | 필수 여부 |
|---|---|---|---|
| E1 | Q&A 관리 화면 | png | Y |

## 참고 (판정 제외)
- 흡수: `medusa_domain_feature_list_v1.1 §3-B(Q&A REV-A)`, `_archive/도메인설계/리뷰문의_설계.md`. 알림=d12.
