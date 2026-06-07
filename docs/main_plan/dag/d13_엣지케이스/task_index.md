---
doc_type: program_spec
schema_version: v2.6
status: ready
dag_id: d13_엣지케이스
domain: 엣지케이스·예외(횡단)
owner: main
created: 2026-06-03
---

# 도메인 task 목차 — d13_엣지케이스 (task_index)

> 쇼핑몰 운영 난이도의 핵심 = 정상 흐름이 아니라 엣지/예외/연계 실패다. 본 DAG는 **횡단 위험 테마**를 task로, 개별 엣지케이스(총 ~147건 조사)를 각 task의 `unit_test` 판정표 row로 1:1 수용한다.
> 기반: qa_legacy 34 + `_archive/도메인설계/엣지케이스/*` 흡수 + 딥리서치(업계 BP·한국 전자상거래법). 단순 입력검증(handle/email 중복 등)은 각 원천 도메인 task §4에 이미 커버 → 본 DAG는 동시성·장애·사기·정책경계·상태전이·대사 중심.

## task 목록 (= 기능 상세명세 매핑)

| task_id | 기능명 | 목적 | surface | task_spec | unit 문서 | 담당 agent | 상태 | result_required | result_kind | result_path | evidence_raw_path | reason |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| t001_결제멱등성 | 결제 멱등성·중복결제 | idempotency-key·webhook event dedup·일일 reconciliation 대사(연계 d2·d7) | 검증 | t001_결제멱등성.md | ../../unit_test/unit_074_결제멱등성.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t001_result.md | ../../../new-bo/{RUN_ID}/t001_raw.json | - |
| t002_재고동시성 | 재고 동시성·오버셀 | 낙관락(version)·원자차감·예약/해제 경쟁(연계 d3·d2) | 검증 | t002_재고동시성.md | ../../unit_test/unit_075_재고동시성.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t002_result.md | ../../../new-bo/{RUN_ID}/t002_raw.json | - |
| t003_복합결제부분취소환불 | 복합결제 부분취소·환불 | 비례배분(1원)·배송비 재청구·다중 트랜잭션 환불 분할(연계 d2·d7·d8) | 검증 | t003_복합결제부분취소환불.md | ../../unit_test/unit_076_복합결제부분취소환불.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t003_result.md | ../../../new-bo/{RUN_ID}/t003_raw.json | - |
| t004_청약철회정책경계 | 청약철회 정책 경계 | 7일 기산점·배송비 부담주체·철회불가 사유·3영업일 환불 SLA(연계 d2·d6) | 검증 | t004_청약철회정책경계.md | ../../unit_test/unit_077_청약철회정책경계.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t004_result.md | ../../../new-bo/{RUN_ID}/t004_raw.json | - |
| t005_물류분실파손 | 물류 분실·파손·오배송 | 48~72h 대기창·클레임·증거요건·수령거부 회송(연계 d6·d2) | 검증 | t005_물류분실파손.md | ../../unit_test/unit_078_물류분실파손.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t005_result.md | ../../../new-bo/{RUN_ID}/t005_raw.json | - |
| t006_반품환불어뷰징 | 반품·환불 어뷰징 | serial returner·friendly fraud·차지백·카드 블랙리스트·리스크기반 검수(연계 d2·d5) | 검증 | t006_반품환불어뷰징.md | ../../unit_test/unit_079_반품환불어뷰징.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t006_result.md | ../../../new-bo/{RUN_ID}/t006_raw.json | - |
| t007_상태머신전이가드 | 상태머신 전이 가드 | FSM 역행/직접전이 차단·부분배송 상태·rollback(연계 d2) | 검증 | t007_상태머신전이가드.md | ../../unit_test/unit_080_상태머신전이가드.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t007_result.md | ../../../new-bo/{RUN_ID}/t007_raw.json | - |
| t008_쿠폰포인트경계 | 쿠폰·포인트 경계 | 만료직전·1회용 동시사용·환불 시 포인트 음수·블랙리스트 pending 처리(연계 d8·d5) | 검증 | t008_쿠폰포인트경계.md | ../../unit_test/unit_081_쿠폰포인트경계.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t008_result.md | ../../../new-bo/{RUN_ID}/t008_raw.json | - |
| t009_관리자동시성권한예외 | 관리자 동시성·권한 예외 | 동시편집 충돌·권한충돌·강제조작·승인누락·정산 직접수정 차단(연계 d11·전도메인) | 검증 | t009_관리자동시성권한예외.md | ../../unit_test/unit_082_관리자동시성권한예외.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t009_result.md | ../../../new-bo/{RUN_ID}/t009_raw.json | - |
| t010_정산대사 | 정산 대사·후발환불 | 월마감 후 후발환불·held_amount 해제·PG수수료 환불·원장↔PG 대사(연계 d7) | 검증 | t010_정산대사.md | ../../unit_test/unit_083_정산대사.md | new-bo | O | true | result | ../../../new-bo/{RUN_ID}/t010_result.md | ../../../new-bo/{RUN_ID}/t010_raw.json | - |

> task PASS 게이트(validate_task_gate.py): `result_required=true` → `result_path`+`evidence_raw_path`+G-EVIDENCE.CLAIM PASS 필수.

## 의존성
- 본 DAG는 횡단(cross-cutting). 각 task는 원천 도메인(d2~d12)의 정상 task가 PASS된 뒤 그 위에서 엣지를 검증한다.
- t001_결제멱등성·t007_상태머신전이가드 = 결제·주문 안정성 blocker 성격(FAIL 시 거래 무결성 붕괴).
- t009_관리자동시성권한예외 ← d11 t010_RBAC·t011_감사로그 전제.

## 작성 규칙 (양식 — 판정 기준)
- 필수 키 + 필수 표 헤더 + orphan 0.

## 참고 (판정 제외)
- 흡수 원천: `_archive/qa_legacy/*`(qa_KR-001~003 포함), `_archive/도메인설계/엣지케이스/*`(결제_엣지강화·회원_엣지강화 등), `_archive/도메인설계/주문_설계.md`.
- 딥리서치 근거: 결제 멱등성(idempotency-key 24~48h·webhook dedup·reconciliation), 재고 낙관락, 반품/환불 사기(serial returner·friendly fraud·차지백), 물류 클레임(48~72h 대기·증거요건), 한국 전자상거래법(청약철회 7일·단순변심 소비자 배송비/불량 사업자 부담·위약금 청구 금지).
- 1차 작성. 개별 147건 중 동시성·사기·장애·정책경계·상태전이·대사 중심 수용. 단순 입력검증류는 원천 도메인 task §4 커버(중복 미수록).
