---
doc_type: task_spec
schema_version: v2.6
status: ready
dag_id: d4_카테고리
task_id: t006_slug검증캐시
feature: slug 검증·캐시 무효화
surface: API
owner: main
target_agent: new-bo
unit_doc: ../../unit_test/unit_029_slug검증캐시.md
qa_doc: ../../qa/qa_004_카테고리.md
created: 2026-06-02
---

# 기능 상세명세 — t006 slug 검증·캐시 무효화 (갭B)

> Medusa core 無 → 커스텀 미들웨어/구독자. 카테고리/컬렉션 slug(handle) 중복·형식 검증 + 변경 시 캐시 무효화.

## 1. 기능 목적
- 카테고리/컬렉션 handle(slug)의 형식(소문자/하이픈)·전역 중복을 검증하고, 변경/삭제 시 관련 스토어프론트 캐시를 무효화한다.

## 2. 사용자 흐름

| step | 사용자 행동 | 시스템 반응 | 화면/상태 | 성공 기준 |
|--:|---|---|---|---|
| 1 | slug 입력(t001/t003) | 형식·중복 검증 | 검증 | 통과/거부 |
| 2 | 저장 | 저장 + 캐시 무효화 이벤트 | 반영 | 캐시 갱신 |

## 3. 화면/상태 정의

| state_id | 상태명 | 진입 조건 | 표시 요소 | 금지/예외 |
|---|---|---|---|---|
| S1 | 검증 | slug 입력 | 형식/중복 결과 | 중복 차단 |

## 4. 입력/검증 규칙

| input_id | 입력값 | 필수 | 검증 규칙 | 실패 메시지 |
|---|---|:--:|---|---|
| I1 | slug | Y | `^[a-z0-9-]+$` + 전역 유일 | slug 형식/중복 |

## 5. 액션/버튼/이벤트

| action_id | 트리거 | 기대 동작 | API | 성공 결과 | 실패 결과 |
|---|---|---|---|---|---|
| A1 | slug 저장 | 검증 미들웨어 | (t001/t003 저장 경로) | 통과 | 422 |
| A2 | 변경/삭제 | 캐시 무효화 구독자 | (event) | 캐시 purge | 재시도 |

## 6. API 영향

| api_id | method | path | request | response | error |
|---|---|---|---|---|---|
| API1 | POST | /admin/slugs/validate | handle, scope | 200 ok | 422 중복/형식 |

## 7. DB 영향

| table | action | field | before | after | 비고 |
|---|---|---|---|---|---|
| product_category/collection | select(유일성) | handle | - | - | 검증 |

## 8. 보안/예외 조건

| case_id | 조건 | 기대 처리 | 증적 |
|---|---|---|---|
| C1 | slug 중복 | 422 차단 | 로그 |
| C2 | 캐시 무효화 실패 | 재시도 + 경보 | 로그 |

## 9. unit 매핑

| unit_id | 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| UT-001 | slug 형식/중복 검증 | unit_029 #1 | O |
| UT-002 | 변경 시 캐시 무효화 | unit_029 #2 | O |

## 10. QA 매핑

| qa_id | 연계 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| QA-004 | slug 변경→캐시 무효화 반영 | qa_004 #4 | O |

## 11. 증적 요구사항

| evidence_id | 필요한 증적 | 파일 유형 | 필수 여부 |
|---|---|---|---|
| E1 | slug 검증 차단 API raw | har | Y |
| E2 | 캐시 무효화 로그 | log | Y |

## 참고 (판정 제외)
- 흡수: `medusa_domain_feature_list_v1.1 §4(카테고리 slug검증·캐시무효화)`. 적용 경로=t001/t003.
