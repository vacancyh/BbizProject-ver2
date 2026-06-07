---
doc_type: task_spec
schema_version: v2.6
status: ready
dag_id: d12_마케팅
task_id: t005_CMS공지FAQ배너팝업
feature: CMS(공지/FAQ/배너/팝업)
surface: 화면
owner: main
target_agent: new-fe
unit_doc: ../../unit_test/unit_073_CMS공지FAQ배너팝업.md
qa_doc: ../../qa/qa_012_마케팅.md
created: 2026-06-02
---

# 기능 상세명세 — t005 CMS(공지/FAQ/배너/팝업) (갭B)

> Medusa core 無 → 커스텀(cms module). 노출기간·우선순위·긴급고정 + SVG 악성 검증(업로드 보안).

## 1. 기능 목적
- 공지/FAQ/배너/팝업 콘텐츠를 작성·게시한다. 노출기간·우선순위·긴급고정 + 이미지 업로드 시 SVG 악성 스크립트 검증.

## 2. 사용자 흐름

| step | 사용자 행동 | 시스템 반응 | 화면/상태 | 성공 기준 |
|--:|---|---|---|---|
| 1 | 유형 선택(공지/FAQ/배너/팝업) | 폼 표시 | 작성 | - |
| 2 | 콘텐츠+노출기간+우선순위 | 검증(SVG 스캔) | 미리보기 | 악성 차단 |
| 3 | 게시 | 노출 스케줄 등록 | 게시 | 기간내 노출 |

## 3. 화면/상태 정의

| state_id | 상태명 | 진입 조건 | 표시 요소 | 금지/예외 |
|---|---|---|---|---|
| S1 | CMS 작성 | 진입 | 유형·본문·노출기간·우선순위·긴급고정 | 만료 자동 숨김 |
| S2 | 게시 목록 | 진입 | 상태·기간·우선순위 | - |

## 4. 입력/검증 규칙

| input_id | 입력값 | 필수 | 검증 규칙 | 실패 메시지 |
|---|---|:--:|---|---|
| I1 | 노출기간 | Y | from≤to | 기간 오류 |
| I2 | 이미지 | N | SVG 스크립트/외부참조 차단 | 악성 파일 |
| I3 | 우선순위 | N | 정수, 긴급=최상단 고정 | - |

## 5. 액션/버튼/이벤트

| action_id | 트리거 | 기대 동작 | API | 성공 결과 | 실패 결과 |
|---|---|---|---|---|---|
| A1 | 게시 | 스케줄 등록 | POST /admin/cms/contents | 201 | 400 |
| A2 | 이미지 업로드 | SVG 검증 | POST /admin/uploads | 200/거부 | 400 |

## 6. API 영향

| api_id | method | path | request | response | error |
|---|---|---|---|---|---|
| API1 | POST | /admin/cms/contents | {type,body,from,to,priority,pinned} | 201 | 400 |

## 7. DB 영향

| table | action | field | before | after | 비고 |
|---|---|---|---|---|---|
| cms_content(커스텀) | insert/update | type, body, display_from, display_to, priority, pinned | - | 게시 | cms module |

## 8. 보안/예외 조건

| case_id | 조건 | 기대 처리 | 증적 |
|---|---|---|---|
| C1 | SVG 악성 스크립트 | 업로드 거부(sanitize) | 차단 로그 |
| C2 | 노출기간 만료 | 자동 숨김 | - |
| C3 | XSS 본문 | sanitize | - |

## 9. unit 매핑

| unit_id | 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| UT-001 | CMS 게시(기간/우선순위) + SVG 악성 차단 | unit_073 #1 | O |

## 10. QA 매핑

| qa_id | 연계 검증 대상 | 기준 row | 상태 |
|---|---|---|---|
| QA-005 | CMS 게시 → 노출기간 내 표시 + 만료 숨김 | qa_012 #5 | O |

## 11. 증적 요구사항

| evidence_id | 필요한 증적 | 파일 유형 | 필수 여부 |
|---|---|---|---|
| E1 | CMS 작성/게시 화면 | png | Y |
| E2 | SVG 악성 차단 | json | Y |

## 참고 (판정 제외)
- 흡수: `medusa_domain_feature_list_v1.1 §3-B(CMS)`, `_archive/정의서/파일_16정의서.md`, `_archive/도메인설계/관리자_설계.md`(CMS).
