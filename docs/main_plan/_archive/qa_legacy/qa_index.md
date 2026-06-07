# QA 인덱스 = 메두사 풀테스트 + 한국 모듈 검증

**작성일**: 2026-05-26
**대상 메두사 버전**: 2.15.3 (admin user-guide 기준)
**프로젝트 콘텍스트**: 한국 D2C jewelry shop (1 store / 1 region = KR / 1 sales channel)
**상품 카테고리**: 목걸이 / 귀걸이 / 팔찌 / 반지
**출처 폴더**: `main_plan/외부참조문서/메두사/메두사_www_apps_user-guide_app_*.mdx` (68 페이지 user-guide)

---

## 1. 사전 조건 (모든 시나리오 공통)

| 항목 | 값 |
|---|---|
| Admin 로그인 | `admin@local.test` / `djemalsdlqslek12!@` |
| Region | KR (KRW / Korea, Republic of) |
| Sales channel | 기본 1개 (예: "Storefront") |
| Stock location | 기본 1개 (예: "Seoul Warehouse") |
| Shipping profile | 기본 1개 |
| 한국 모듈 | `rma-extension` · `legal-kr/withdrawal-7day` · `state-machine` 활성화 |

---

## 2. 시나리오 분포 (총 33건)

### 2.1 P1 메두사 표준 (30건)

| 그룹 | 시나리오 ID | 건수 |
|---|---|---|
| **Products** | qa_001 ~ qa_008 | 8 |
| **Inventory** | qa_009 ~ qa_011 | 3 |
| **Orders** | qa_012 ~ qa_021 | 10 |
| **Customers** | qa_022 ~ qa_023 | 2 |
| **Promotions** | qa_024 ~ qa_025 | 2 |
| **Settings** | qa_026 ~ qa_030 | 5 |

### 2.2 한국 모듈 (3건)

| 시나리오 ID | 모듈 | 출처 |
|---|---|---|
| qa_KR-001 | `legal-kr/withdrawal-7day` | 이식설계/스프리_RMA_이식.md §6.1-6.4 |
| qa_KR-002 | `rma-extension` | 이식설계/스프리_RMA_이식.md §5.2 |
| qa_KR-003 | `state-machine` | 이식설계/벤듀어_상태머신_이식.md §2-6 |

---

## 3. 시나리오 인덱스 표

### 3.1 Products (P1)

| ID | 제목 | 출처 user-guide | 우선순위 |
|---|---|---|---|
| qa_001 | 상품 생성 (Create Product) | `products_create_page.mdx` | P1 |
| qa_002 | 상품 편집 (Edit Product) | `products_edit_page.mdx` | P1 |
| qa_003 | 상품 삭제 + 상태 변경 | `products_edit_page.mdx` §Product Statuses | P1 |
| qa_004 | 카테고리 관리 | `products_categories_page.mdx` | P1 |
| qa_005 | 컬렉션 관리 | `products_collections_page.mdx` | P1 |
| qa_006 | 베리언트 관리 (사이즈 / 컬러) | `products_variants_page.mdx` | P1 |
| qa_007 | 상품 import (CSV) | `products_import_page.mdx` | P1 |
| qa_008 | 상품 export (CSV) | `products_export_page.mdx` | P1 |

### 3.2 Inventory (P1)

| ID | 제목 | 출처 user-guide | 우선순위 |
|---|---|---|---|
| qa_009 | 재고 항목 관리 | `inventory_inventory_page.mdx` | P1 |
| qa_010 | 재고 예약 (Reservations) | `inventory_reservations_page.mdx` | P1 |
| qa_011 | 멀티-로케이션 재고 분산 | `settings_locations-and-shipping_locations_page.mdx` | P1 |

### 3.3 Orders (P1)

| ID | 제목 | 출처 user-guide | 우선순위 |
|---|---|---|---|
| qa_012 | 주문 상세 조회 + 주소 편집 | `orders_manage_page.mdx` | P1 |
| qa_013 | 주문 취소 (Cancel Order) | `orders_manage_page.mdx` §Cancel an Order | P1 |
| qa_014 | Fulfillment 생성 + 배송 처리 | `orders_fulfillments_page.mdx` | P1 |
| qa_015 | 결제 capture / refund | `orders_payments_page.mdx` | P1 |
| qa_016 | Return 생성 + Receive | `orders_returns_page.mdx` | P1 |
| qa_017 | Claim 생성 (파손 / 오배송) | `orders_claims_page.mdx` | P1 |
| qa_018 | Exchange 생성 (사이즈 교환) | `orders_exchanges_page.mdx` | P1 |
| qa_019 | Draft Order 생성 | `orders_draft-orders_create_page.mdx` | P1 |
| qa_020 | Order Edit (라인 추가 / 삭제) | `orders_edit_page.mdx` | P1 |
| qa_021 | Order Export | `orders_export_page.mdx` | P1 |

### 3.4 Customers (P1)

| ID | 제목 | 출처 user-guide | 우선순위 |
|---|---|---|---|
| qa_022 | 고객 관리 | `customers_manage_page.mdx` | P1 |
| qa_023 | 고객 그룹 관리 | `customers_groups_page.mdx` | P1 |

### 3.5 Promotions (P1)

| ID | 제목 | 출처 user-guide | 우선순위 |
|---|---|---|---|
| qa_024 | 프로모션 생성 | `promotions_create_page.mdx` | P1 |
| qa_025 | 캠페인 관리 | `promotions_campaigns_page.mdx` | P1 |

### 3.6 Settings (P1)

| ID | 제목 | 출처 user-guide | 우선순위 |
|---|---|---|---|
| qa_026 | Region 관리 (KR) | `settings_regions_page.mdx` | P1 |
| qa_027 | Sales channel 관리 | `settings_sales-channels_page.mdx` | P1 |
| qa_028 | Shipping profile + Option type | `settings_locations-and-shipping_shipping-profiles_page.mdx` | P1 |
| qa_029 | Store + Currency 관리 | `settings_store_page.mdx` | P1 |
| qa_030 | Users + API Key 관리 | `settings_users_page.mdx` · `settings_developer_*` | P1 |

### 3.7 한국 모듈 (P1)

| ID | 제목 | 출처 이식설계 | 우선순위 |
|---|---|---|---|
| qa_KR-001 | 청약철회 7일 자동 승인 | `legal-kr/withdrawal-7day` | P1 |
| qa_KR-002 | RMA 확장 (Reimbursement / Inspection) | `rma-extension` | P1 |
| qa_KR-003 | 상태머신 전이 가드 | `state-machine` (Order/Payment/Refund/Fulfillment) | P1 |

---

## 4. P2 (다음 사이클 = 본 사이클 제외)

- `loyalty/gift-cards` · `loyalty/store-credits` (jewelry shop 단독몰 = 후순위)
- `price-lists` (B2B / VIP 가격) — 후순위
- `settings/translations` 다국어 — 후순위
- `settings/tax-regions` 한국 단일 세율 = 후순위
- `tips/bulk-editor` 단축키 = 후순위
- `loyalty/gift-card-products` = 후순위

---

## 5. PASS / FAIL 판정 룰

- **PASS**: 시나리오 모든 단계 성공 + DB 정합 확인 + 한국 모듈 hook 정상 동작
- **FAIL**: 단계 1개라도 에러 → 박제 (스크린샷 + 에러 메시지 + 단계 번호)
- **SKIP**: 사전 조건 미충족 시 (예: shipping profile 미생성)

