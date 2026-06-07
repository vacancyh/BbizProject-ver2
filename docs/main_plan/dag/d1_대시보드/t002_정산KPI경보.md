---
doc_type: task_spec
schema_version: v2.6
status: ready
dag_id: d1_대시보드
task_id: t002_정산KPI경보
feature: 정산 KPI·경보
surface: 화면
owner: main
target_agent: new-bo
unit_doc: ../../unit_test/unit_002_정산KPI경보.md
qa_doc: ../../qa/qa_001_대시보드.md
created: 2026-06-02
---

# 기능 상세명세 — t002 정산 KPI·경보 (갭B)

> Medusa core 無 → 커스텀. d7_정산관리 집계(net_settlement/held_amount) 기반 핵심지표 + 임계 경보.

## 1. 기능 목적
- 정산 핵심지표(당일/당월 매출·환불·PG수수료·순정산·보류액)를 위젯으로 표시하고, 임계(환불률 급증·보류 누적·미정산 지연) 초과 시 경보를 띄운다.

## 2. 사용자 흐름

| step | 사용자 행동 | 시스템 반응 | 화면/상태 | 성공 기준 |
|--:|---|---|---|---|
| 1 | 대시보드 진입 | 정산 KPI 집계 로드 | KPI 위젯 | 순정산/보류 표시 |
| 2 | 임계 초과 발생 | 경보 배지/알림 | 경보 | 임계 사유 표시 |
| 3 | 경보 클릭 | 정산 관리(d7) 상세 이동 | 정산 | 진입 |

## 3. 화면/상태 정의

| state_id | 상태명 | 진입 조건 | 표시 요소 | 금지/예외 |
|---|---|---|---|---|
| S1 | KPI 로드 | 진입 | 매출·환불·PG수수료·순정산·보류 | 정산 0건 시 빈 위젯 |
| S2 | 경보 | 임계 초과 | 경보 배지 + 사유 | - |

## 4. 입력/검증 규칙

| input_id | 입력값 | 필수 | 검증 규칙 | 실패 메시지 |
|---|---|:--:|---|---|
| I1 | 임계 설정 | N | 환불률/보류/지연 임계값 | - |

## 5. 액션/버튼/이벤트

| action_id | 트리거 | 기대 동작 | API | 성공 결과 | 실패 결과 |
|---|---|---|---|---|---|
| A1 | KPI 로드 | 정산 집계 조회 | GET /admin/dashboard/settlement-kpi | KPI | 503 |
| A2 | 경보 클릭 | d7 정산 이동 | - | 진입 | - |

## 6. API 영향

| api_id | method | path | request | response | error |
|---|---|---|---|---|---|
| API1 | GET | /admin/dashboard/settlement-kpi | period | 200 kpi{} + alerts[] | 503 |

## 7. DB 영향

| table | action | field | before | after | 비고 |
|---|---|---|---|---|---|
| settlement_daily | select | sales/refund/pg_fee/net/held | - | - | d7 집계 읽기 |

## 8. 보안/예외 조건

| case_id | 조건 | 기대 처리 | 증적 |
|---|---|---|---|
| C1 | 정산 권한(정산/재무/SUPER) | 등급 제한 노출 | 감사로그 |

## 9. unit 매핑

| unit_id | 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| UT-001 | 정산 KPI 집계 표시 | unit_002 #1 | O |
| UT-002 | 임계 초과 경보 | unit_002 #2 | O |

## 10. QA 매핑

| qa_id | 연계 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| QA-002 | 정산 집계(d7)→KPI 위젯 반영 | qa_001 #2 | O |

## 11. 증적 요구사항

| evidence_id | 필요한 증적 | 파일 유형 | 필수 여부 |
|---|---|---|---|
| E1 | KPI 위젯 화면 | png | Y |
| E2 | 경보 트리거 trace | zip | Y |

## 참고 (판정 제외)
- 흡수: `medusa_domain_feature_list_v1.1 §4(대시보드 정산 KPI·경보)`. 원천 집계 = d7_정산관리 t002.
