---
doc_type: task_spec
schema_version: v2.6
status: ready
dag_id: d11_쇼핑몰설정
task_id: t010_RBAC권한
feature: RBAC 권한
surface: 화면
owner: main
target_agent: new-bo
unit_doc: ../../unit_test/unit_067_RBAC권한.md
qa_doc: ../../qa/qa_011_쇼핑몰설정.md
created: 2026-06-02
---

# 기능 상세명세 — t010 RBAC 권한 (갭B · blocker)

> Medusa core 無 → 커스텀(rbac module). SUPER/OPERATION/CS/MARKETER 등급 + 메뉴별·기능별 CRUD 2계층. 전 메뉴 접근통제 진입점(d5 t003_관리자계정 연결). FAIL 시 ABORT.

## 1. 기능 목적
- 관리자 역할(SUPER/OPERATION/CS/MARKETER)별로 메뉴 접근과 기능(CRUD)을 2계층으로 통제한다. 모든 도메인 화면/액션의 권한 게이트 진입점.

## 2. 사용자 흐름

| step | 사용자 행동 | 시스템 반응 | 화면/상태 | 성공 기준 |
|--:|---|---|---|---|
| 1 | 역할 목록 | 조회 | 목록 | 등급 표시 |
| 2 | 메뉴·기능 권한 매트릭스 편집 | 갱신 | 매트릭스 | 저장 |
| 3 | 사용자에 역할 부여 | 연결(d5 t003) | 완료 | 즉시 반영 |

## 3. 화면/상태 정의

| state_id | 상태명 | 진입 조건 | 표시 요소 | 금지/예외 |
|---|---|---|---|---|
| S1 | 권한 매트릭스 | 진입 | 역할×메뉴×CRUD 토글 | SUPER만 편집 |
| S2 | 차단 | 권한 없음 | 403 안내 | 화면/액션 숨김 |

## 4. 입력/검증 규칙

| input_id | 입력값 | 필수 | 검증 규칙 | 실패 메시지 |
|---|---|:--:|---|---|
| I1 | 역할 | Y | SUPER/OPERATION/CS/MARKETER | 역할 오류 |
| I2 | 권한 비트 | Y | C/R/U/D 조합 | 권한 오류 |

## 5. 액션/버튼/이벤트

| action_id | 트리거 | 기대 동작 | API | 성공 결과 | 실패 결과 |
|---|---|---|---|---|---|
| A1 | 매트릭스 저장 | 갱신 | PUT /admin/rbac/roles/:role | 200 | 403 |
| A2 | 역할 부여 | 사용자-역할 연결 | POST /admin/users/:id/role | 200 | 403 |

## 6. API 영향

| api_id | method | path | request | response | error |
|---|---|---|---|---|---|
| API1 | GET | /admin/rbac/roles | - | 200 matrix | 401 |
| API2 | PUT | /admin/rbac/roles/:role | {permissions} | 200 | 403 |

## 7. DB 영향

| table | action | field | before | after | 비고 |
|---|---|---|---|---|---|
| rbac_role(커스텀) | update | role, permissions(jsonb) | - | 갱신 | rbac |
| user(메두사) | update | role(연결) | - | 갱신 | d5 t003 |

## 8. 보안/예외 조건

| case_id | 조건 | 기대 처리 | 증적 |
|---|---|---|---|
| C1 | 비SUPER 권한 편집 | 403 | 감사로그(t011) |
| C2 | 권한 없는 메뉴 접근 | 화면/API 차단 | 감사로그(t011) |
| C3 | SUPER 0명화 시도 | 차단(최소 1명 보장) | - |
| **C4** | **보안/시스템 메뉴 접근(비SUPER)** | **읽기까지 전면 차단** — `permissions`·`policies`·`audit-logs` 는 SUPER 전용(`SUPER_ONLY_MENUS`, 옵션 A) | 감사로그 |
| **C5** | **역할 미배정 관리자** | fail-closed 자기치유: SUPER 가 존재하면 차단, 없으면 부트스트랩 grace 허용 | 감사로그 |

> 📌 **정책 확정(옵션 A)**: 초기 설계에서는 보안 메뉴도 "읽기는 허용(READ-only)" 이었으나,
> 권한·정책·감사로그는 **조회 자체가 민감**하므로 SUPER 외 전면 차단으로 강화했다.
> (2026-07-28: 옛 READ-only 기대값을 검증하던 유닛 테스트 2건을 현행 정책에 맞게 갱신)

## 9. unit 매핑

| unit_id | 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| UT-001 | 역할별 메뉴·CRUD 게이트(허용/차단) | unit_067 #1 | O |
| UT-002 | 역할 부여(d5 t003) 즉시 반영 | unit_067 #2 | O |
| UT-003 | **보안 메뉴(permissions·policies·audit-logs) 비SUPER 전면 차단** | `rbac.unit.spec.ts` | ✅ (2026-07-28 갱신) |

## 10. QA 매핑

| qa_id | 연계 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| QA-010 | 역할 부여 → 전 도메인 메뉴 접근통제 | qa_011 #10 | O |

## 11. 증적 요구사항

| evidence_id | 필요한 증적 | 파일 유형 | 필수 여부 |
|---|---|---|---|
| E1 | 권한 매트릭스 화면 | png | Y |
| E2 | 차단(403) 응답 | json | Y |

## 참고 (판정 제외)
- 흡수: `medusa_domain_feature_list_v1.1 §3-B(RBAC)`, `_archive/도메인설계/관리자_설계.md`, `_archive/정의서/상태머신_19정의서.md`. blocker — FAIL 시 ABORT. 사용자=d5 t003, 감사=t011.
