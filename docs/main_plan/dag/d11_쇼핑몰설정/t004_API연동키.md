---
doc_type: task_spec
schema_version: v2.6
status: ready
dag_id: d11_쇼핑몰설정
task_id: t004_API연동키
feature: API/연동 키
surface: 화면
owner: main
target_agent: new-fe
unit_doc: ../../unit_test/unit_061_API연동키.md
qa_doc: ../../qa/qa_011_쇼핑몰설정.md
created: 2026-06-02
---

# 기능 상세명세 — t004 API/연동 키 (갭A)

> Medusa `api-key-management` 호출/래핑. Publishable/Secret 키 + sales-channels 연결.

## 1. 기능 목적
- Publishable/Secret API 키를 발급·폐기·재발급하고 판매채널(t003)에 연결한다. 키 노출은 1회(생성 시)만.

## 2. 사용자 흐름

| step | 사용자 행동 | 시스템 반응 | 화면/상태 | 성공 기준 |
|--:|---|---|---|---|
| 1 | 키 목록 | api-keys 조회 | 목록 | 마스킹 표시 |
| 2 | 키 생성 | 발급 + 1회 노출 | 생성 모달 | 평문 1회 |
| 3 | 채널 연결/폐기 | 갱신 | 편집 | 반영 |

## 3. 화면/상태 정의

| state_id | 상태명 | 진입 조건 | 표시 요소 | 금지/예외 |
|---|---|---|---|---|
| S1 | API 키 | 진입 | 종류·토큰(마스킹)·연결채널·상태 | 평문 재노출 금지 |

## 4. 입력/검증 규칙

| input_id | 입력값 | 필수 | 검증 규칙 | 실패 메시지 |
|---|---|:--:|---|---|
| I1 | 키 종류 | Y | publishable/secret | 종류 오류 |
| I2 | 제목 | Y | 1~50자 | 제목 필수 |

## 5. 액션/버튼/이벤트

| action_id | 트리거 | 기대 동작 | API | 성공 결과 | 실패 결과 |
|---|---|---|---|---|---|
| A1 | 키 생성 | 발급 | POST /admin/api-keys | 201 (평문 1회) | 400 |
| A2 | 폐기 | revoke | POST /admin/api-keys/:id/revoke | 200 | 400 |

## 6. API 영향

| api_id | method | path | request | response | error |
|---|---|---|---|---|---|
| API1 | GET | /admin/api-keys | type | 200 list(마스킹) | 401 |
| API2 | POST | /admin/api-keys/:id/sales-channels | {add,remove} | 200 | 400 |

## 7. DB 영향

| table | action | field | before | after | 비고 |
|---|---|---|---|---|---|
| api_key(메두사) | insert/update | token(해시), type, revoked_at | - | 갱신 | core API |

## 8. 보안/예외 조건

| case_id | 조건 | 기대 처리 | 증적 |
|---|---|---|---|
| C1 | 평문 노출 | 생성 시 1회만, 이후 마스킹 | - |
| C2 | 키 발급/폐기 | SUPER 권한 + 감사 | 감사로그(t011) |

## 9. unit 매핑

| unit_id | 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| UT-001 | 키 발급(1회 노출) + 폐기 + 채널 연결 | unit_061 #1 | O |

## 10. QA 매핑

| qa_id | 연계 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| QA-004 | API키 발급/폐기 → 감사로그(t011) | qa_011 #4 | O |

## 11. 증적 요구사항

| evidence_id | 필요한 증적 | 파일 유형 | 필수 여부 |
|---|---|---|---|
| E1 | API 키 화면(마스킹) | png | Y |

## 참고 (판정 제외)
- 흡수: `medusa_domain_feature_list_v1.1 §2(api-key-management)+§3-A`. 채널=t003, 감사=t011.
