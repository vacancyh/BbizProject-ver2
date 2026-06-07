# Medusa 도메인별 기능 리스트 및 우리 관리자 앱 마이그레이션 분석 v1.1

- 작성일: 2026-06-01 (v1.0 → v1.1 보강)
- 기준 버전: **실제 설치본** `@medusajs/dashboard@2.15.3` (node_modules 소스 전수 확인 — 추측 아님)
- 보강 소스 (3-소스 교차):
  - (A) 설치된 실물 대시보드 라우트 = `backend/services/api/node_modules/@medusajs/dashboard@2.15.3/src/routes/` 전수 (Medusa 앱 루트 = `backend/services/api/`)
  - (B) 우리 받은/작성 문서 = `0dev_haness_agents/main_plan/user_plan/쇼핑몰_전용_QA_v4.md`(741 QA), `0dev_haness_agents/main_plan/도메인설계/관리자_설계.md`, `공통_인프라_보안_QA.md`, `이커머스 관리자 화면.zip`
  - (C) 웹검색 = Medusa 공식 문서/Admin
- v1.0 대비 변경: 도메인 18개(추상) → **실물 35개 도메인 / 150+ 화면·액션**으로 세분화 + 우리 문서 요구와 **양방향 갭 매핑** 추가.

---

## 1. 핵심 결론 (갱신)
- Medusa v2.15.3 실물 대시보드는 **35개 라우트 도메인**을 가지며, 각 도메인은 list/create/detail/edit + 특수액션(주문의 fulfillment·return·exchange·claim·refund·transfer 등)으로 화면이 세분화된다. 마이그레이션은 **도메인이 아니라 이 화면·액션 단위로 커버리지를 추적**해야 누락이 안 생긴다.
- 우리 관리자 요구(741 QA)의 상당수는 Medusa core를 **호출/래핑**으로 충족 가능하나, **한국형 운영 기능(갭B)** 은 Medusa에 없어 custom module/화면이 필요하다 → 해당 메뉴엔 `(메두사기능없음)` 배지.
- 반대로 Medusa에는 있으나 우리 메뉴에 아직 자리 없는 기능(갭A: 컬렉션·가격목록·판매채널·세금지역·예약·캠페인·번역 등)은 **드롭 금지 — 신규 화면 설계까지 마이그레이션**.

---

## 2. Medusa 실물 화면·액션 전수 인벤토리 (v2.15.3, 35 도메인)

> 출처 (A): `backend/services/api/node_modules/@medusajs/dashboard@2.15.3/src/routes/` 실제 폴더. 각 항목 = 우리 앱(`apps/admin`, Next.js)이 호출/래핑으로 재현해야 할 대상.

### 2-1. 커머스 운영 (사이드바 본 메뉴)

| # | 도메인 (routes/) | 화면·액션 |
|---|---|---|
| 1 | home | 대시보드(위젯) |
| 2 | products | list, create, **import(CSV)**, **export**, detail, edit, attributes, organization(카테고리/컬렉션/태그), shipping-profile, media, image-variants-edit, prices, create-option, edit-option, create-variant, stock, metadata, sales-channels |
| 3 | product-variants | detail, edit(SKU/바코드/가격), manage-inventory-items, media, metadata |
| 4 | categories | list, create, detail, edit, **organize(계층/순서)**, products(추가·제거), metadata |
| 5 | collections | list, create, detail, edit, add-products, metadata |
| 6 | orders | list, **export**, detail, create-fulfillment, receive-return, allocate-items, create-shipment(송장/배송사), create-return, create-claim, create-exchange, create-edit, create-refund, request-transfer, edit-email, edit-shipping-address, edit-billing-address, metadata |
| 7 | price-lists | list, create, detail, edit, configuration(고객그룹/지역 대상), prices-add, prices-edit, metadata |
| 8 | promotions | list, create, detail, edit-details, edit-rules, add-campaign |
| 9 | campaigns | list, create, detail, edit, configuration, budget-edit, add-promotions |
| 10 | customers | list, create, detail(주문이력/주소), edit, create-address, add-customer-group, metadata |
| 11 | customer-groups | list, create, detail, edit, add-customers, metadata |
| 12 | reservations | list, create, detail, edit(모달), metadata |
| 13 | inventory | list, create, detail, edit-item, edit-attributes, metadata, manage-locations, **adjust(증감)**, stock(대량조정/추이) |
| 14 | profile | detail, edit(이름/이메일/비번) |

### 2-2. 설정 (settings 레이아웃)

| # | 도메인 (routes/) | 화면·액션 |
|---|---|---|
| 15 | store | detail, edit(통화/지역/기본채널), add-currencies, add-locales, metadata |
| 16 | users | list, **invite**, detail, edit(역할/활성), metadata |
| 17 | regions | list, create, detail, edit, add-countries, metadata |
| 18 | tax-regions | list, create, detail, edit, metadata + province-create/detail + tax-rate-create/edit + tax-override-create/edit |
| 19 | sales-channels | list, create, detail, edit, add-products, metadata |
| 20 | locations | list, create, detail, edit, sales-channels(할당), fulfillment-providers, metadata |
| 21 | shipping-profiles | list, create, detail, metadata |
| 22 | shipping-option-types | list, create, detail, edit |
| 23 | (locations 내) service-zone | create, edit, manage-areas, shipping-option-create/edit, shipping-option-pricing(지역별/금액별) |
| 24 | product-tags | list, create, detail, edit, metadata |
| 25 | product-types | list, create, detail, edit, metadata |
| 26 | api-key-management | (Publishable) list, create, detail, edit, sales-channels + (Secret) 동일 구성 |
| 27 | return-reasons | list, create, edit |
| 28 | refund-reasons | list, create, edit |
| 29 | workflow-executions | list, detail(단계별 입출력/상태) |
| 30 | translations | list, settings, edit, add-locales (feature-flag, v2.12.3+) |

### 2-3. 인증·기타

| # | 도메인 (routes/) | 화면 |
|---|---|---|
| 31 | login | 로그인 |
| 32 | reset-password | 비밀번호 초기화(토큰) |
| 33 | invite | 초대 수락(토큰) |
| 34 | no-match | 404 |
| 35 | (web확인) gift-cards | 기프트카드 관리 — Admin API 리소스에 존재(설치 구성/플러그인에 따라 노출). 우리 채택 여부 별도 판단 |

---

## 3. 양방향 갭 매핑 (마이그레이션 커버리지 핵심)

### 3-A. 갭A — Medusa 有 · 우리 메뉴에 자리 미정 (드롭 금지, 신규 화면 설계까지)

| Medusa 도메인 | 우리 처리 방향 | 비고 |
|---|---|---|
| collections | 상품 관리 하위 "컬렉션/기획전" 신규 화면 | 우리 "홈 큐레이션"과 연계 가능 |
| price-lists | "회원등급별/기간 특가" 화면으로 흡수 | 우리 멤버십 등급 가격과 매핑 |
| reservations | 재고 관리 하위 "예약/할당" 화면 | 주문 allocate-items와 연동 |
| sales-channels | 설정 하위(단독몰=1채널 기본) | 네이버/마켓 확장 대비 |
| regions / tax-regions | 설정 하위(한국 단순화 시작) | 국내 VAT 단순 시작 |
| locations / stock-locations | 설정 "창고/출고지" | 초기 1곳 |
| shipping-profiles / option-types / service-zones | 설정 "배송 정책" | 우리 배송비 정책과 통합 설계 |
| campaigns | "이벤트/캠페인" 화면 | 우리 이벤트 쿠폰(CPN)과 매핑 |
| product-tags / product-types | 설정 하위 (types는 기존 product-type 모듈 활용) | |
| api-key-management | 설정 "API/연동 키" | publishable=스토어프론트 |
| workflow-executions | 설정/시스템 "워크플로우 로그" | 운영 모니터링 |
| translations | 보류(한국어 단독) — 아키텍처만 대비 | feature-flag |
| return-reasons / refund-reasons | 설정 "반품·환불 사유 코드" | 우리 반품 프로세스와 연동 |
| draft orders (orders/create) | 주문 "수기 주문 생성" | 전화/CS 주문 |
| gift-cards | 채택 여부 결정 후 진행 | 플러그인 의존 |

### 3-B. 갭B — 우리 문서 要求 有 · Medusa core 無 (= 메뉴에 `(메두사기능없음)` 배지 + custom module)

> 출처 (B): `쇼핑몰_전용_QA_v4.md`, `관리자_설계.md`. Medusa는 호출/래핑 불가 → 신규 custom module/화면.

| 영역 | 핵심 기능 | 권장 구현 | QA 출처 |
|---|---|---|---|
| **관리자 권한(RBAC)** | SUPER/OPERATION/CS/MARKETER 등급 + 메뉴별·기능별 CRUD 2계층 | rbac module + API 미들웨어 | ADM-R, 관리자_설계 §5.1 |
| **감사 로그** | 모든 write 액션 append-only + 5년 보관 + PII 마스킹 | audit module + 미들웨어 | ADM-R-010, §5.3 |
| **정책 저장소** | system_policies 통합 + 이중확인 + 변경이력(SUPER) | policy module | ADM-S, §5.5 |
| **멤버십 등급** | 구매금액 자동 등급(일반/실버/골드/VIP) + 등급별 적립률·쿠폰 + 연초 리셋 | membership module | MEM-A-019~033 |
| **포인트** | 가입/구매/리뷰/추천/출석 적립·사용·소멸 + 유효기간 + D-N 알림 | point module | CPN-A-017~040 |
| **쿠폰(한국식)** | 정률/정액, 최대할인·최소주문, 대량발급(비동기), 자동발급, 강제회수, 취소복원 | promotion 래핑 + coupon-ops module | CPN-A-001~031 |
| **현금영수증/세금계산서** | 신청·발급·정정·취소 승인 플로우 | tax-receipt module | MEM-A-029, PAY-A |
| **블랙리스트·제재** | 단계 제재(경고→7→30→영구) + 사유분류 + 진행중 주문 처리 | sanction module | ADM-P-001~008 |
| **국내 배송/택배** | 국내 택배사(CJ·우체국 등) + 기본택배사 + 운송장 CSV 일괄 | delivery-ops module + provider adapter | DEL-A-007~012B |
| **반품·교환 검수** | 신청→수거→검수(양호/불량)→완료/거절 + 자동알림 + 교환 차액 | rma 확장(기존 rma-extension 활용) | DEL-A-012~059 |
| **정산** | 일/월 매출·환불·PG수수료·순정산 + 날짜경계 귀속 + 부분취소 차감 + 엑셀 | settlement module | ORD-A-013~020 |
| **마케팅 발송** | 이메일([광고]·List-Unsubscribe·야간차단·동의자만), SMS, 카카오 알림톡 이벤트별 ON/OFF | notification provider(카카오/SMS) + segment module | ADM-M-001~012 |
| **상품정보고시·KC·원산지** | 카테고리별 고시 템플릿 + validation + versioning | legal-kr 확장(기존 모듈 활용) | PRD-A, 관리자_설계 |
| **CMS(공지/FAQ/배너/팝업)** | 노출기간·우선순위·긴급고정 + SVG 악성 검증 | cms module | ADM-N/F/B |
| **리뷰·Q&A·1:1문의** | 조회/숨김/복원 + 베스트리뷰 포인트 + 미답변 필터 | review/inquiry module | REV-A |
| **타임세일** | 기간·재고 제한 + 종료 시 원가 복원 + 소진 자동종료 | flash-sale module | PRD-A-015~019 |
| **상품통계·홈큐레이션** | 조회수/판매량/위시 + 인기검색어 + 베스트·신상품 섹션 + 금칙어 | analytics 집계 + curation module | PRD-A-020~032 |
| **재고 동시성** | 원자적 차감 + 음수방지(CHECK) + 배치 충돌 처리 | inventory 래핑 + 락(Locking 모듈) | PRD-A-050~057 |
| **시스템 운영** | 점검모드(scope) + 헬스(DB/Redis polling) + 약관관리 + 매출리포트 자동발송 + CS통합이력 | system/ops module | ADM-S-001~011 |

---

## 4. 도메인별 커버리지 매트릭스 (마이그레이션 추적 시드)

> 마이그레이션 시작 시 이 표를 `apps/admin/FEATURE_MATRIX.md`로 옮겨 상태(TODO/DOING/DONE) 컬럼을 채운다.

| 우리 메뉴(예정) | Medusa 기반(호출/래핑) | 갭B 보강(custom) | 우선순위 |
|---|---|---|---|
| 대시보드 | 집계(dashboard/stats wrap) | 정산 KPI·경보 | High |
| 주문 관리 | orders 전 화면 + payment + fulfillment | 강제취소·정산연동·내부메모 | High |
| 상품 관리 | products + variants + inventory + price-lists | 고시·타임세일·통계·큐레이션 | High |
| 카테고리 | categories + collections + tags + types | slug검증·캐시무효화 | High |
| 회원 관리 | customers + customer-groups + users | 멤버십·포인트·제재·현금영수증·동의이력 | High |
| 배송 관리 | fulfillment + locations + shipping-profiles | 국내택배·운송장CSV·반품검수 | Medium |
| 정산 관리 | payment(원장) | settlement 전체 | Medium |
| 쿠폰·프로모션 | promotions + campaigns + price-lists | 한국식쿠폰·자동발급·포인트·이벤트 | Medium |
| 리뷰·문의 | (Medusa 없음) | review/inquiry module | Medium |
| 통계·리포트 | orders/products 집계 | 매출리포트 자동발송 | Medium |
| 쇼핑몰 설정 | store + regions + tax + sales-channels + api-keys + workflows | 정책저장소·약관·점검·헬스·RBAC·감사 | Medium |
| 마케팅(신규) | notification(이메일) | SMS·카카오·세그먼트·CMS | Medium |

---

## 5. Claude Code 작업 지침 (갱신)
1. Medusa 기본 Admin UI는 기준 아님 — 우리 `apps/admin`(Next.js 구현) 화면 기준 유지. 디자인·UX 사양 = `apps/admin/prototype/`(정적 프로토타입).
2. 커버리지는 **§2 화면·액션 단위**로 추적(`FEATURE_MATRIX.md`). 도메인 단위 추적 금지(누락 발생).
3. Medusa 기능 = **호출/래핑만**(복사·재구현·포크 금지). 1순위 REST `/admin/*` → 2순위 얇은 wrap endpoint → 3순위 custom module.
4. 갭A(§3-A) = 우리 메뉴에 자리 없어도 **신규 화면 설계+구현까지** = 전수 이전. 드롭 금지.
5. 갭B(§3-B) = custom module + 해당 메뉴에 `(메두사기능없음)` 배지 + 별도 문서.
6. 상품정보고시/KC/정산/국내송장/개인정보 마스킹을 Medusa core로 착각 금지.
7. metadata 임시저장 가능하나 validation/versioning/audit 필요 도메인은 module 분리.

## 6. 출처
- (A) 설치 실물: `backend/services/api/node_modules/@medusajs/dashboard@2.15.3/src/routes/` (35 도메인 전수, Medusa 앱 루트 = `backend/services/api/`)
- (B) 우리 문서: `0dev_haness_agents/main_plan/user_plan/쇼핑몰_전용_QA_v4.md`(741 QA), `0dev_haness_agents/main_plan/도메인설계/관리자_설계.md`, `공통_인프라_보안_QA.md`, `이커머스 관리자 화면.zip`
- (C) 웹: [Medusa Admin](https://medusajs.com/admin/), [Admin Development](https://docs.medusajs.com/learn/fundamentals/admin), [Admin API Reference](https://docs.medusajs.com/api/admin), [Commerce Modules](https://docs.medusajs.com/resources/commerce-modules)
- v1.0 원본: `medusa_domain_feature_list_v1.0.md` (도메인·인프라 모듈 개요 — §개념 참조용 유지)
