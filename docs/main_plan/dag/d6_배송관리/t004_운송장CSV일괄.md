---
doc_type: task_spec
schema_version: v2.6
status: ready
dag_id: d6_배송관리
task_id: t004_운송장CSV일괄
feature: 운송장 CSV 일괄
surface: 화면
owner: main
target_agent: new-bo
unit_doc: ../../unit_test/unit_041_운송장CSV일괄.md
qa_doc: ../../qa/qa_006_배송관리.md
created: 2026-06-02
---

# 기능 상세명세 — t004 운송장 CSV 일괄 (갭B)

> Medusa core 無 → 커스텀(delivery-ops). 운송장 번호 CSV 일괄 등록 → 일괄 발송 처리(d2 t003 batch).

## 1. 기능 목적
- 다수 주문의 운송장 번호를 CSV로 일괄 업로드해 매칭·검증 후 일괄 발송(shipping 전이)한다. 매칭 실패 행 리포트.

## 2. 사용자 흐름

| step | 사용자 행동 | 시스템 반응 | 화면/상태 | 성공 기준 |
|--:|---|---|---|---|
| 1 | CSV 업로드(주문번호,택배사,송장) | 매칭·검증 | 미리보기 | 매칭 결과 |
| 2 | 일괄 발송 확정 | 일괄 shipping + 알림 | 진행 | 발송 완료 |
| 3 | 완료 | 성공/실패 리포트 | 리포트 | - |

## 3. 화면/상태 정의

| state_id | 상태명 | 진입 조건 | 표시 요소 | 금지/예외 |
|---|---|---|---|---|
| S1 | 매칭 검증 | 업로드 | 매칭/미매칭 행 | 미매칭 차단 |
| S2 | 일괄 발송 | 확정 | 진행률·리포트 | 중복 송장 차단 |

## 4. 입력/검증 규칙

| input_id | 입력값 | 필수 | 검증 규칙 | 실패 메시지 |
|---|---|:--:|---|---|
| I1 | CSV | Y | 헤더/주문번호 매칭/송장 형식 | 매칭 실패 |
| I2 | 송장 | Y | 택배사별 형식 + 중복 금지 | 송장 중복 |

## 5. 액션/버튼/이벤트

| action_id | 트리거 | 기대 동작 | API | 성공 결과 | 실패 결과 |
|---|---|---|---|---|---|
| A1 | 일괄 업로드 | 매칭·검증 | POST /admin/delivery/shipments/import | 미리보기 | 422 |
| A2 | 일괄 발송 | batch shipping | POST /admin/delivery/shipments/bulk-ship | 발송 | 부분 실패 리포트 |

## 6. API 영향

| api_id | method | path | request | response | error |
|---|---|---|---|---|---|
| API1 | POST | /admin/delivery/shipments/import | file | 202 job | 422 |

## 7. DB 영향

| table | action | field | before | after | 비고 |
|---|---|---|---|---|---|
| fulfillment | update | tracking, shipped_at | - | 발송 | native batch |

## 8. 보안/예외 조건

| case_id | 조건 | 기대 처리 | 증적 |
|---|---|---|---|
| C1 | 미매칭 주문 | skip + 리포트 | 리포트 |
| C2 | 송장 중복 | 차단 | 로그 |

## 9. unit 매핑

| unit_id | 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| UT-001 | CSV 매칭·검증 | unit_041 #1 | O |
| UT-002 | 일괄 발송(부분 성공 리포트) | unit_041 #2 | O |

## 10. QA 매핑

| qa_id | 연계 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| QA-003 | CSV→일괄 발송→배송중(d2) | qa_006 #3 | O |

## 11. 증적 요구사항

| evidence_id | 필요한 증적 | 파일 유형 | 필수 여부 |
|---|---|---|---|
| E1 | 일괄 발송 리포트 화면 | png | Y |
| E2 | import job API raw | har | Y |

## 참고 (판정 제외)
- 흡수: `medusa_domain_feature_list_v1.1 §3-B(운송장 CSV 일괄)`. 발송=d2 t003.
