---
doc_type: dag_index
schema_version: v2.6
status: ready
project_id: shop
project_name: 단독몰 관리자 (Medusa 어드민 리플랫폼)
owner: main
created: 2026-06-02
---

# 프로그램 전체 목차 — dag_index (shop 관리자)

> 이 문서 하나로 shop 관리자(어드민 리플랫폼)의 도메인/업무 전체를 파악한다. agent read-only.
> DAG = 프로그램 1개 = 관리자 메뉴(도메인) 1개. 도메인 입도 = `medusa_domain_feature_list_v1.1.md §4` 의 "우리 메뉴(예정)" 12개 기준.
> task = 도메인 안 기능 1개 = 단위테스트 1개. QA = 도메인(DAG) 연계 검증 1개.
> 원칙: Medusa core 는 호출/래핑(복사·재구현·포크 금지). 갭A=신규화면 설계까지 이전, 갭B=custom module + `(메두사기능없음)` 배지.

## 프로그램(DAG) 목차

| dag_id | 프로그램/도메인 | 목적 | 주요 사용자 | task_index | qa 문서 | 상태 |
|---|---|---|---|---|---|---|
| d1_대시보드 | 대시보드 | 운영 KPI·경보 한눈에 | 관리자 | dag/d1_대시보드/task_index.md | qa/qa_001_대시보드.md | O |
| d2_주문관리 | 주문 관리 | 주문 생명주기(이행·반품·교환·클레임·환불·정산연동) | 운영/CS | dag/d2_주문관리/task_index.md | qa/qa_002_주문관리.md | O |
| d3_상품관리 | 상품 관리 | 상품·변형·재고·가격·고시·타임세일·통계 | 운영/MD | dag/d3_상품관리/task_index.md | qa/qa_003_상품관리.md | O |
| d4_카테고리 | 카테고리 | 카테고리·컬렉션·태그·유형·상품연동 | 운영/MD | dag/d4_카테고리/task_index.md | qa/qa_004_카테고리.md | O |
| d5_회원관리 | 회원 관리 | 고객·그룹·관리자계정·멤버십·포인트·제재·세금계산서 | 운영/CS | dag/d5_회원관리/task_index.md | qa/qa_005_회원관리.md | O |
| d6_배송관리 | 배송 관리 | 출고지·배송정책·국내택배·운송장·반품검수 | 운영/물류 | dag/d6_배송관리/task_index.md | qa/qa_006_배송관리.md | O |
| d7_정산관리 | 정산 관리 | 결제원장·일/월 정산·PG수수료·엑셀 | 정산/재무 | dag/d7_정산관리/task_index.md | qa/qa_007_정산관리.md | O |
| d8_쿠폰프로모션 | 쿠폰·프로모션 | 프로모션·캠페인·한국식쿠폰·이벤트·등급가격 | 마케터 | dag/d8_쿠폰프로모션/task_index.md | qa/qa_008_쿠폰프로모션.md | O |
| d9_리뷰문의 | 리뷰·문의 | 리뷰·상품Q&A·1:1문의 관리 | 운영/CS | dag/d9_리뷰문의/task_index.md | qa/qa_009_리뷰문의.md | O |
| d10_통계리포트 | 통계·리포트 | 매출/상품 통계 + 리포트 자동발송 | 운영/경영 | dag/d10_통계리포트/task_index.md | qa/qa_010_통계리포트.md | O |
| d11_쇼핑몰설정 | 쇼핑몰 설정 | 스토어·지역세금·채널·API키·정책·약관·RBAC·감사 | SUPER | dag/d11_쇼핑몰설정/task_index.md | qa/qa_011_쇼핑몰설정.md | O |
| d12_마케팅 | 마케팅 | 이메일·SMS·카카오알림톡·세그먼트·CMS | 마케터 | dag/d12_마케팅/task_index.md | qa/qa_012_마케팅.md | O |
| d13_엣지케이스 | 엣지케이스·예외(횡단) | 결제멱등·재고동시성·복합환불·청약철회·물류분실·어뷰징·상태전이·쿠폰포인트·관리자예외·정산대사 | 전 도메인 | dag/d13_엣지케이스/task_index.md | qa/qa_013_엣지케이스.md | O |

- `상태` = 기획 확정 여부(O/X). 도메인마다 1행.
- d1~d12 = 관리자 메뉴 도메인 12개. d13 = 횡단 엣지 DAG(메뉴 아님, 전 도메인 운영 안정성 검증).

## 작성 규칙 (양식 — 판정 기준)
- 필수 키: `doc_type, schema_version, status, project_id, project_name`
- 필수 표 헤더: `dag_id | 프로그램/도메인 | 목적 | 주요 사용자 | task_index | qa 문서 | 상태` (row≥1)
- 검증: `dag_id`/`task_index`/`qa 문서` 경로 필수, `상태`는 strict O/X, 도메인마다 1행.

## 참고 (판정 제외)
- 도메인 분해 근거 = `medusa_domain_feature_list_v1.1.md` §2(실물 35 라우트) + §3(양방향 갭) + §4(우리 메뉴 12 커버리지 매트릭스).
- 인증(login/reset-password/invite) = d5_회원관리 t003_관리자계정에 흡수. 스토어프론트 전용(장바구니·위시리스트·사용자쇼핑)은 본 어드민 DAG 범위 밖 → `_archive/` 참조 보존.
- legacy `task/task_index.md`(10 업무별, v1) = freeze 보존. 본 dag_index 가 신규 정본.
