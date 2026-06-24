# QA 리포트 — 쿠폰·프로모션 도메인 (/coupons)

- 검증 일시: 2026-06-01
- 검증 방식: 실제 admin 웹(http://localhost:7002) + 실제 backend REST(http://localhost:9000) + 실제 DB(shop-postgres) 라이브 검증
- 검증자 계정: smoke-admin@local.test
- 종합 판정: **PASS** (결함 0건, WARN 2건 — 환경 데이터/툴링 이슈)

---

## 1. promotions.list — 목록

| 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|
| 페이지 진입·렌더 | PASS | h1 "쿠폰·프로모션", 헤더 부제 "전체 N건 · 상품 연계 / 주문 연계" 정상. shots/coupons-01-list-empty.png | 초기 active 0건 → "쿠폰이 없습니다" 빈 상태 정상 |
| 콘솔 에러 | PASS | browser_console_messages(error, all) = favicon.ico 404 1건만. 애플리케이션 에러 0건 | favicon 404는 무해 |
| 목록 컬럼(코드·할인요약·적용대상·상태) | PASS | 생성 후 행: "QA-ITEMEACH5 \| 코드 입력 \| 상품 5% 할인 \| 상품/분류 \| 활성". shots/coupons-05-list-row.png | 4개 컬럼 모두 정상 바인딩 |
| 카운트 표시 | PASS | 생성 1건 후 "전체 1건" 정상 갱신 | |

## 2. promotions.create — 생성 드로어(4섹션)

| 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|
| 드로어 4섹션 렌더 | PASS | 1.쿠폰 기본 / 2.할인 / 3.적용 대상(상품 연계) / 4.주문 조건(주문 연계) 모두 표시. shots/coupons-02-create-drawer.png | |
| 적용대상 조건부 UI(scope=products) | PASS | scope=특정 상품 선택 시 "상품당 최대 적용 수량" 입력 + "특정 상품 검색" 박스 동적 노출. shots/coupons-03-create-filled.png | React 상태 반응 정상 |
| 상품 검색·선택(target) | PASS | "Medusa" 검색 → 결과 표시 → 추가 시 칩 1개(chips:1) 등록 | listProducts 연동 정상 |
| **생성 #1 — 상품연계+maxQty (each)** | PASS | code=QA-ITEMEACH5, 정률 5%, 특정 상품 1개, maxQty=2. 토스트 "쿠폰 'QA-ITEMEACH5'을(를) 생성했습니다" | DB 검증 아래 참조 |
| └ DB application_method | PASS | type=percentage, target_type=**items**, value=5, **allocation=each**, **max_quantity=2** | maxQuantity 지정 → each + max_quantity 계약 정확 |
| └ DB target_rules | PASS | attribute=**items.product.id**, operator=in, values=[prod_01KSHQA14C70T557ABGHMWM9HP] | Medusa 상품연계 계약 정확 |
| **생성 #2 — 주문연계 (across)** | PASS | code=QA-ORDER10, 정액 3000 KRW, scope=주문 전체. 토스트 성공. shots/coupons-04-detail-items.png(상세) | |
| └ DB application_method | PASS | type=fixed, target_type=**order**, value=3000, currency_code=krw, **allocation=across**, max_quantity=NULL | maxQuantity 미지정 → across, order scope → target_rules 없음. 계약 정확 |
| 통화 처리(currency_code) | PASS | fixed 선택 시 KRW 드롭다운 노출, DB currency_code=krw 저장 | 하드코딩 아님 |

## 3. promotions.detail / edit-rules — 상세·규칙·상태변경

| 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|
| 상세 드로어 렌더 | PASS | 생성 직후 상세 자동 오픈. 코드/적용방식/할인/적용대상/상품당 최대 수량 모두 표시 | |
| 상품 연계 규칙 표시(target_rules) | PASS | "특정 상품 · in · 1개 지정" 표시 | attrLabel 매핑 정상 |
| 주문 조건 표시(rules) | PASS | "조건 없음(전체 회원·전체 주문)." 표시 | 규칙 없을 때 안내 정상 |
| 상태 변경(active→inactive) | PASS | 비활성 버튼 클릭 → 토스트 "상태를 '비활성'(으)로 변경했습니다", 비활성 버튼 활성(disabled)화 | |
| └ DB 반영 | PASS | promotion.status = inactive 영속 확인 | |
| 삭제(soft-delete) | PASS | 상세 삭제 → 확인 모달 → 삭제. 토스트 "쿠폰을 삭제했습니다". DB deleted_at 세팅 확인 | 2건 모두 정상 삭제 |

## 4. 감사 로그(audit_log)

| 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|
| write 감사 기록 | PASS | POST /admin/promotions → audit_log "POST coupons" status=200 기록(13:28:28). DELETE도 "DELETE coupons" 기록 | action 필드에 menu("coupons") 임베드 |
| actor_email 기록 | WARN | audit_log.actor_email 컬럼이 빈 값(NULL) | 감사 추적성 약화 — 본 도메인 범위 밖(공통 audit 미들웨어 이슈). 별도 확인 권장 |

---

## 결함 목록

- **결함(FAIL): 0건**

## WARN(결함 아님, 참고)

1. **회원그룹(주문 연계) 경로 미검증** — DB에 customer_groups 0건이라 생성 폼의 "대상 회원 그룹" 드롭다운에 "전체 회원"만 존재. 따라서 rules(customer.groups.id) 생성 경로는 라이브로 실행 불가. 코드 레벨(promotions.ts createPromotion → orderRules → rules 매핑)은 정상 구현 확인했으나, 데이터 부재로 end-to-end 미실행. 회원그룹 시드 후 재검증 권장.
2. **audit_log.actor_email 빈 값** — write는 기록되나 작성자 이메일이 비어 있음(공통 audit 레이어). 본 도메인 외 이슈.

## 환경 메모(검증 절차 관련, 제품 결함 아님)

- admin은 `next dev`(개발 모드, host PID 93815)로 구동 중. Playwright의 hard `browser_navigate`(full page goto)가 dev 하이드레이션과 경합하여 /coupons 진입 직후 다른 사이드바 라우트로 client soft-nav 이탈하는 현상 관측. **in-page soft-nav(사이드바 링크 클릭) 시 안정적으로 /coupons 유지됨**(history.pushState 계측으로 확인, 자발적 redirect 아님). 본 검증은 soft-nav + 단일 evaluate 트랜잭션으로 안정 수행. 제품 라우팅 결함 아님.

## 정리(cleanup)

- 검증용 생성 2건(QA-ITEMEACH5, QA-ORDER10) 모두 UI 삭제(soft-delete) 처리.
- 최종 active/undeleted promotion = **0건** 복원 완료.
