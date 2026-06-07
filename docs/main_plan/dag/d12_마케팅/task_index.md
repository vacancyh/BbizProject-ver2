---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d12_마케팅
domain: 마케팅
owner: main
created: 2026-06-02
---

# 도메인 task 목차 — d12_마케팅 (task_index)

> 이 도메인엔 어떤 기능(task)이 있는지 파악한다. agent read-only.
> 기반: Medusa `notification`(이메일) 호출/래핑 + 갭B(SMS·카카오알림톡·세그먼트·CMS) custom(provider/module).

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_이메일발송 | 이메일 발송 | notification 이메일([광고]·List-Unsubscribe·야간차단·동의자만) | 화면 | t001_이메일발송.md | ../../unit_test/unit_069_이메일발송.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t001_result.md | ../../../new-bo/{RUN_ID}/t001_raw.json | - |
| t002_SMS발송 | SMS 발송 | SMS provider 연동 + 광고/정보성 분기(갭B) | 화면 | t002_SMS발송.md | ../../unit_test/unit_070_SMS발송.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t002_result.md | ../../../new-bo/{RUN_ID}/t002_raw.json | - |
| t003_카카오알림톡 | 카카오 알림톡 | KakaoBiz 알림톡 이벤트별 ON/OFF + 템플릿(갭B) | 화면 | t003_카카오알림톡.md | ../../unit_test/unit_071_카카오알림톡.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t003_result.md | ../../../new-bo/{RUN_ID}/t003_raw.json | - |
| t004_세그먼트 | 세그먼트 | 발송 대상 세그먼트 정의/추출(갭B, d5 그룹 cross) | 화면 | t004_세그먼트.md | ../../unit_test/unit_072_세그먼트.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t004_result.md | ../../../new-bo/{RUN_ID}/t004_raw.json | - |
| t005_CMS공지FAQ배너팝업 | CMS(공지/FAQ/배너/팝업) | 노출기간·우선순위·긴급고정 + SVG 악성 검증(갭B) | 화면 | t005_CMS공지FAQ배너팝업.md | ../../unit_test/unit_073_CMS공지FAQ배너팝업.md | new-fe | O | true | result | ../../../new-fe/{RUN_ID}/t005_result.md | ../../../new-fe/{RUN_ID}/t005_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- t001~t004 발송 대상 ← d5_회원관리(고객/동의이력)·t004_세그먼트. t001~t003 발송 트리거 ← d2(주문)·d5(포인트 D-N)·d10(리포트) 이벤트.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/정의서/알림_15정의서.md`·`파일_16정의서.md`, `_archive/도메인설계/관리자_설계.md`(CMS/마케팅 영역).
