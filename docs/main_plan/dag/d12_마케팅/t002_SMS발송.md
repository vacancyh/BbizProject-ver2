---
doc_type: task_spec
schema_version: v2.6
status: ready
dag_id: d12_마케팅
task_id: t002_SMS발송
feature: SMS 발송
surface: 화면
owner: main
target_agent: new-bo
unit_doc: ../../unit_test/unit_070_SMS발송.md
qa_doc: ../../qa/qa_012_마케팅.md
created: 2026-06-02
---

# 기능 상세명세 — t002 SMS 발송 (갭B)

> Medusa core 無 → 커스텀(sms provider). SMS/LMS 발송 + 광고/정보성 분기. 광고=[광고]+무료수신거부번호+야간차단.

## 1. 기능 목적
- SMS provider를 연동해 SMS/LMS를 발송한다. 광고성은 [광고] 표기 + 무료 수신거부 + 야간차단, 정보성(주문/배송)은 즉시 발송.

## 2. 사용자 흐름

| step | 사용자 행동 | 시스템 반응 | 화면/상태 | 성공 기준 |
|--:|---|---|---|---|
| 1 | 대상/유형(광고·정보) 선택 | 수신자 산출 | 작성 | 분기 적용 |
| 2 | 메시지 입력 | 길이/표기 검증 | 미리보기 | 규칙 통과 |
| 3 | 발송 | provider 발송 | 발송 | 로그 |

## 3. 화면/상태 정의

| state_id | 상태명 | 진입 조건 | 표시 요소 | 금지/예외 |
|---|---|---|---|---|
| S1 | SMS 작성 | 진입 | 대상·유형·본문·예약 | 광고+야간 금지 |

## 4. 입력/검증 규칙

| input_id | 입력값 | 필수 | 검증 규칙 | 실패 메시지 |
|---|---|:--:|---|---|
| I1 | 본문 | Y | SMS 90byte/LMS 자동전환 | 길이 오류 |
| I2 | 유형 | Y | ad/info | 유형 오류 |

## 5. 액션/버튼/이벤트

| action_id | 트리거 | 기대 동작 | API | 성공 결과 | 실패 결과 |
|---|---|---|---|---|---|
| A1 | 발송 | provider 발송 | POST /admin/notifications/sms | 200 | 400 |

## 6. API 영향

| api_id | method | path | request | response | error |
|---|---|---|---|---|---|
| API1 | POST | /admin/notifications/sms | {targets,type,body,scheduled_at} | 200 | 400 |

## 7. DB 영향

| table | action | field | before | after | 비고 |
|---|---|---|---|---|---|
| sms_send_log(커스텀) | insert | target, type, status, provider_msg_id | - | append | sms provider |

## 8. 보안/예외 조건

| case_id | 조건 | 기대 처리 | 증적 |
|---|---|---|---|
| C1 | 광고+야간 | 차단 | 발송 로그 |
| C2 | 비동의자(광고) | 제외 | 동의이력(d5) |

## 9. unit 매핑

| unit_id | 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| UT-001 | 광고/정보 분기 + [광고]/야간차단 | unit_070 #1 | O |

## 10. QA 매핑

| qa_id | 연계 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| QA-002 | 주문(d2) 이벤트 → 정보성 SMS 발송 | qa_012 #2 | O |

## 11. 증적 요구사항

| evidence_id | 필요한 증적 | 파일 유형 | 필수 여부 |
|---|---|---|---|
| E1 | SMS 발송 화면 | png | Y |

## 참고 (판정 제외)
- 흡수: `medusa_domain_feature_list_v1.1 §3-B(SMS)`, `_archive/정의서/알림_15정의서.md`. 동의=d5 t008, 트리거=d2.
