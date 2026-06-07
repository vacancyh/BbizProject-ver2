# 03 Medusa 구현가능성 검수 (Adversarial Audit)

> 검수 축: **Medusa 구현가능성 + 코어 무수정 격리 패턴 준수**
> 검수 대상: `main_plan/도메인설계/` 9개 도메인 설계서 + `상품_카테고리_설계.md` (총 10건)
> 대조 코드: `apps/backend/apps/backend/` (Medusa v2.15.3) — `node_modules/@medusajs/*`, `src/modules/*`, `src/links/*`, `medusa-config.ts`, 실 DB(`shop-postgres`, 154개 테이블 실측)
> 검수일: 2026-05-31 · 검수자: 설계 검수 sub-agent
> **원칙: 추측 금지. 모든 판정은 node_modules / 실 DB / 소스 파일 경로로 실증.**

---

## 0. 검수 방법 (실증 근거)

- **native 모듈 실측**: `@medusajs/medusa/dist/modules/` (auth/cart/order/payment/product/customer/promotion/fulfillment/inventory/pricing/region/tax/sales-channel/user/store/currency/stock-location/notification/file + 각 provider). 모든 core 모듈은 `@medusajs/medusa/<module>` 서브패스로 resolve (별도 패키지 아님).
- **linkable 키 실측**: `node -e "require('@medusajs/medusa/<module>').default.linkable"` 런타임 호출로 각 모듈의 link 가능 모델 목록 직접 추출.
- **테이블명 실측**: `docker exec shop-postgres psql ... pg_tables` — 실제 생성된 154개 테이블 직접 조회.
- **격리 선례**: `src/modules/legal-kr/withdrawal-7day`, `rma-extension`, `state-machine`, `product-type` + `src/links/order-withdrawal.ts`, `order-return-rma.ts` 실 파일 확인.

---

## 1. 발견사항 표

| 심각도 | 도메인 | 주장 | 실제 (코드/DB 확인) | 권고 |
|---|---|---|---|---|
| **MAJOR** | 결제 / 회원 | `@medusajs/payment-stripe@2.15.3`, `@medusajs/auth-google@2.15.3` 가 "설치됨/설치 확인 완료"된 **별도 패키지** | `package.json` dependencies 에 **두 패키지 모두 없음**. 실제로는 `@medusajs/medusa` 안에 **번들**되어 `@medusajs/medusa/payment-stripe`·`/auth-google` 서브패스로만 resolve 됨 (`require` 실증). 기능 자체는 사용 가능하나 "설치 확인 완료" 표현은 사실과 다름 | import 경로를 `@medusajs/medusa/auth-google` (서브패스)로 명시. "별도 dependency 설치됨" 문구 정정. payment-stripe 는 미사용이므로 설치 주장 자체 삭제 |
| **MAJOR** | 관리자 | "Medusa native User 에 role/MFA/failed_login_count/locked_until 없음 → RBAC feature-flag `rbac` 미확정(추가 확인 필요)" | `@medusajs/rbac` 모듈 resolve 가능 + 실 DB 에 `invite_rbac_role`·`user_rbac_role` 테이블 **이미 존재**(=rbac 모듈 마이그레이션 적용됨). 단, role/permission 의 세분(scope×action) 마스터는 native 미제공이 맞음 | rbac 가 "미확정"이 아니라 "기본 활성(테이블 존재)"임을 정정. 단 §5.1 의 `admin_roles`/`admin_permissions` 커스텀 2-테이블 설계는 native rbac 의 단순 role 매핑으로 충분한지 **과설계 여부 재검토**(아래 과설계 항목 참조) |
| **MAJOR** | 장바구니 | 한국형 카트 메타(`price_at_add`/`selected`/`version`/`last_seen_at`)를 위해 별도 모델 `cart_kr_meta`·`cart_item_kr_meta` 신설 + line_item 1:1 defineLink | native `LineItem` 에 `metadata`(json), `compare_at_unit_price`, `unit_price` 등 존재 확인. 라인 단위 1:1 별도 테이블 + defineLink 4종은 **카트(휘발성 임시 버퍼)에 과한 인프라**. 문서 스스로 §8 에서 "metadata JSON vs 별도 모델" 미결로 남김 | MVP 는 native `LineItem.metadata` + `Cart.metadata` 로 흡수 권장. 별도 모델은 인덱스 성능 실측 후 도입. defineLink 1:1 라인 메타는 link 테이블 폭증(주문량×라인) 리스크 → 보류 |
| **MINOR** | 배송 | `rma-extension` 모델 목록에 `reimbursement-type` / `ReimbursementType` 로 표기 | 실제 모델은 `model.define("ReimbursementMethod", ...)` → 테이블 `reimbursement_method`. 파일명만 `reimbursement-type.ts`, 모델·테이블·linkable 키는 모두 `reimbursementMethod` | 문서의 `ReimbursementType` → `ReimbursementMethod` 로 정정 (linkable 키 `reimbursementMethod` 가 정답) |
| **MINOR** | 상품·카테고리 | (현 상태) `src/modules/option-template` + `category_option_template` 테이블 존재, `product-type` 로 진화 예정 | 실 DB 에 **구 `category_option_template` 테이블 + 신 `product_type_template`·`product_type_option_template` 테이블 동시 존재** (마이그레이션 진행 중 잔존). `option-template` 모듈 디렉토리는 이미 `product-type` 로 교체됨(medusa-config 등록도 product-type) | 잔존 `category_option_template` 테이블 정리(drop) 마이그레이션 명시. 문서의 "현 상태=option-template" 기술은 코드 기준 이미 1단계 완료 상태로 갱신 |
| **MINOR** | 위시리스트 | `restock_subscription(...) WHERE notified_at IS NULL` 부분 인덱스를 db:generate 후 "수동 추가 필요 가능성" / DML 부분 인덱스 지원 범위 미확인(Q-WIS-08) | Medusa DML `model.define().indexes([{ where: "..." }])` 로 부분 인덱스 **공식 지원**(legal-kr `withdrawal_eligibility` 의 UNIQUE 인덱스 선례). 별도 raw SQL 불필요 | Q-WIS-08 을 "DML indexes() where 옵션으로 해소"로 종결. raw SQL 보강 문구 삭제 |
| **MINOR** | 결제 / 쿠폰포인트 | DB CHECK 제약·트리거(`refund 누적 ≤ 결제액`, `balance>=0`)를 마이그레이션 raw SQL 로 추가 | 사실 정합 (Medusa DML `.checks()` 로 CHECK 는 지원하나 BEFORE INSERT 트리거는 raw SQL 필요). product-review 튜토리얼의 `.checks([{expression}])` 선례 존재 | 단순 범위 CHECK 는 DML `.checks()` 우선 사용, 누적 검증 트리거만 raw SQL. 문서에 두 경로 분리 명시 |
| **INFO** | 전체 | 모든 설계가 "Medusa 코어 entity 직접 FK 금지 + defineLink + 별도 모듈 + medusa-config resolve" = legal-kr 격리 패턴 준수 주장 | **정합 확인**. 실 DB 의 link 테이블이 `{module}_{model}` 네임스페이스(`order_order_withdrawal7day_withdrawal_eligibility` 등)로 자동 격리됨 → 코어/커스텀 테이블 충돌 구조적 차단 | 격리 패턴 판정 = **PASS** (BLOCKER/MAJOR 없음) |

> **BLOCKER 0건. MAJOR 3건. MINOR 4건. INFO 1건.**

---

## 2. §6 Medusa 매핑 — native 실재성 검증 (항목 1)

각 설계서가 §6 에서 "활용한다"고 명시한 native 모듈/모델/linkable/API/provider 인터페이스를 **실제 코드로 대조**. **없는 것을 있다고 한 BLOCKER = 0건.**

| 설계 주장 | 실증 결과 | 판정 |
|---|---|---|
| (회원) Customer/Auth/auth-emailpass/auth-google/user/rbac/notification 모듈 | 전부 `@medusajs/medusa/<module>` resolve 성공. customer linkable = `customer/customerAddress/customerGroup/customerGroupCustomer` 실측 | OK |
| (회원/관리자) Auth MFA 네이티브 모델 `auth_mfa_factor`·`auth_mfa_recovery_code` 실재 | 실 DB 두 테이블 **존재 확인** | OK (주장 TRUE) |
| (결제) `@medusajs/payment` PaymentCollection/Session/Payment/Capture/Refund/RefundReason/AccountHolder | payment linkable = `paymentCollection/paymentSession/payment/capture/refund/refundReason/accountHolder/paymentProvider` 전부 실측 | OK |
| (결제) `Refund.metadata`(v2.15.0~) 에 취소전표 URL 보존 | 실 DB `refund.metadata` 컬럼 **존재** | OK |
| (결제) `AbstractPaymentProvider` (`@medusajs/framework/utils`) 베이스 + 10개 메서드 | `require('@medusajs/framework/utils').AbstractPaymentProvider` **존재**. 메서드는 추상(인터페이스) — Medusa v2 Payment Provider 표준 계약과 일치 | OK |
| (주문) `Order.custom_display_id`(한국형 주문번호용 native 필드) | 실 DB `order.custom_display_id text` 컬럼 **존재** (native) | OK (주장 TRUE — 비표준이나 실재) |
| (주문) `Order.status` native 6종 = pending/completed/canceled/draft/archived/requires_action | 실 DB `order_status_enum` = 정확히 6종 **일치** | OK |
| (주문) `OrderChange`/`OrderSummary`/`Return`/`Exchange`/`Claim`/`Transaction`/`CreditLine` 활용 | order linkable = `order/orderAddress/orderLineItem/orderShippingMethod/orderTransaction/orderChange/orderItem/returnReason/return/orderClaim/orderExchange` 실측 + 실 DB `order_summary`/`order_change`/`return`/`order_exchange`/`order_claim`/`order_transaction`/`order_credit_line` 테이블 존재 | OK |
| (장바구니) `@medusajs/cart` 모델 + core-flows(addToCart/refreshCartItems/transferCartCustomer/completeCart 등) + `Cart.locale` | cart linkable = `cart/creditLine/address/lineItem/...` 실측. 실 DB `cart`+computed. `order.locale` 컬럼 존재(cart 도 동형) | OK |
| (쿠폰포인트) Promotion native (promotion/promotion-rule/application-method/campaign/campaign-budget) + `Promotion.limit` + campaign budget `attribute` | promotion linkable = `promotion/applicationMethod/campaign/campaignBudget/campaignBudgetUsage/promotionRule/promotionRuleValue` 실측. 실 DB `promotion.limit` 컬럼 + `promotion_campaign_budget.attribute`·`type` 컬럼 **존재** | OK |
| (쿠폰포인트) native promotion 은 medusa-config 미등록이어도 코어 자동 로드 | 실 DB `promotion` 테이블 존재 + SELECT 정상(0행) → medusa-config modules 에 없음에도 **자동 로드 확인** | OK (주장 TRUE) |
| (배송) `@medusajs/fulfillment` (FulfillmentSet/ServiceZone/GeoZone/ShippingOption/FulfillmentLabel) + `IFulfillmentProvider`(fp_manual_manual) | fulfillment linkable = `fulfillmentSet/serviceZone/shippingOption/geoZone/shippingProfile/.../fulfillmentProvider/.../fulfillment` 실측. 실 DB `geo_zone`/`service_zone`/`shipping_option`/`fulfillment_label` 존재 | OK |
| (배송) Return/OrderClaim/OrderExchange first-class + core-flows RMA | order linkable `return`/`orderClaim`/`orderExchange` + return_status_enum 실측 | OK |
| (리뷰문의) review/qna/inquiry/chat native **부재** → 커스텀 필수 | `dist/modules/` 에 해당 모듈 **없음 확인** → 주장 정합 | OK |
| (리뷰문의) `file`·`notification`·`user`·`auth` native 활용 + product-review 튜토리얼 패턴 | 4개 모듈 전부 resolve 성공 | OK |
| (위시리스트) wishlist/restock native **부재** → 커스텀 + defineLink readOnly | `dist/modules/` 부재 확인. `defineLink` source 에 `readOnly`·`isList` 토큰 **존재**(옵션 실재) | OK |
| (관리자) `@medusajs/user`(User/Invite) + Auth actor_type="user" + Notification + admin customization | user linkable = `user/invite` 실측. Invite/user 테이블 존재 | OK |

**결론(항목 1)**: 9개 도메인 + 상품·카테고리 모두 §6 에서 인용한 native 자산이 **실재**. **허위 native 주장(BLOCKER) = 0건.** auth-google/payment-stripe 의 "별도 패키지 설치" 표현만 부정확(MAJOR — 기능은 가용).

---

## 3. 테이블명 충돌 검증 (항목 2)

native 핵심 테이블(실측): `product`, `product_category`, `product_type`, `product_collection`, `product_tag`, `product_variant`, `customer`, `customer_group`, `order`, `cart`, `payment`, `refund`, `promotion`, `return`, `fulfillment`, `user` 등.

| 설계 커스텀 모델 (제안) | native 충돌 여부 | 판정 |
|---|---|---|
| `product_type_template` / `product_type_option_template` (상품·카테고리) | native `product_type` 와 **prefix 유사하나 별개 테이블명** — 충돌 없음 (실 DB 4개 테이블 공존 확인) | OK (단 명명 혼동 주의 — 아래) |
| `cart_kr_meta`/`cart_item_kr_meta`/`cart_coupon_kr`/`cart_policy_kr` (장바구니) | native `cart`/`cart_line_item`/`cart_promotion` 과 비충돌 | OK |
| `payment_attempt`/`card_payment_block`/`payment_anomaly`/`pg_fee_rule`/`installment_setting`/`payment_webhook_log` (결제 payment-kr) | native `payment`/`payment_session`/`payment_collection` 과 비충돌 | OK |
| `point_account`/`point_transaction`/`coupon_issue`/`coupon_code` (쿠폰포인트) | native promotion 계열과 비충돌. **단 `coupon_*` 는 native 미사용 명이라 안전** | OK |
| `wishlist`/`wishlist_item`/`wishlist_share`/`restock_subscription` (위시리스트) | native 부재 → 비충돌 | OK |
| `review`/`review_like`/`review_report`/`inquiry`/`inquiry_reply`/`chat_session`/`chat_message`/`cs_case` (리뷰문의) | native 부재 → 비충돌 | OK |
| `admin_role`/`admin_permission`/`admin_profile`/`admin_audit_log`/`system_policy`/... (관리자) | native `user`/`invite` 와 비충돌 | OK |
| `settlement_daily`/`purchase_confirmation`/`exchange_group`/`idempotency_key` (주문) | native `order_summary`/`order_transaction` 과 비충돌 | OK |

> **테이블명 직접 충돌 = 0건.** 명명 주의 1건(아래).

**명명 혼동 경고 (MINOR)**: 상품·카테고리 설계가 native `product_type`(상품유형 라벨) 위에 커스텀 `product_type_template`(옵션·고시 정의)를 얹는 구조 → **"product_type" 이름이 native(라벨)·커스텀(템플릿) 양쪽에 걸침**. defineLink 또는 `product.type_id` 참조 시 어느 product_type 을 가리키는지 코드/문서에 명확히 구분 필요(혼동 시 매핑 버그 유발). 충돌은 아니나 가독성·유지보수 리스크.

---

## 4. 격리 패턴 준수 검증 (항목 3)

기준 = legal-kr 패턴: ① 코어 entity 직접 FK 금지(텍스트 컬럼 + defineLink) ② defineLink 로만 연결 ③ medusa-config modules 등록 ④ 코어 테이블 무수정.

| 검증 항목 | 실증 | 판정 |
|---|---|---|
| 코어 직접 FK 금지 | legal-kr `withdrawal_eligibility.order_id = model.text().unique(...)` (FK 아님, link 로 연결) — 모든 설계가 이 패턴 인용 | OK |
| defineLink 로만 연결 | `order-withdrawal.ts` 가 `OrderModule.linkable.order ↔ ...linkable.withdrawalEligibility` 로 1:1/1:N(isList) 정의. 실 DB 에 `order_order_withdrawal7day_*` link 테이블 자동 생성 확인 | OK |
| readOnly link (위시/리뷰) | `defineLink` source 에 `readOnly` 옵션 실재 확인 → 위시/리뷰의 "readOnly = link 테이블 미생성 조회" 주장 구현 가능 | OK |
| medusa-config 등록 | 현 modules = state-machine/rma-extension/legal-kr·withdrawal-7day/product-type 4종 등록 확인. 신규 모듈도 동일 방식 등록 가능 | OK |
| 코어 테이블 무수정 | 실 DB native 테이블에 커스텀 컬럼 ALTER 흔적 없음(전 설계가 별도 테이블 + link 로 격리) | OK |

> **격리 패턴 위반 = 0건. 전 도메인 PASS.** 단 §3 의 장바구니 라인 1:1 defineLink 는 패턴상 합법이나 **운영 규모(link 테이블 행수 = 누적 카트라인)** 측면에서 비권장(MAJOR로 별도 기재).

---

## 5. 과설계 검증 (항목 4) — native 충분 영역에 커스텀 신설 여부

| 영역 | 설계 결정 | 과설계 판정 | 권고 |
|---|---|---|---|
| 결제 본체/환불 | S0 커스텀 `payments`/`refunds` 를 **native Payment/Refund + metadata 로 흡수**, 한국형 부족분(card_hash·idempotency_sub_key·블랙리스트·이상거래)만 커스텀 | **적절** (문서 §6.2 가 명시적으로 native 우선·흡수 결정 + §7.3 에 "이중 테이블 회피" 리스크 박제) | 유지. PL 단계 흡수 범위 확정만 |
| 쿠폰 정책 마스터 | native Promotion 으로 매핑(type/target/limit/campaign budget) + `coupon_issues` 발급이력만 커스텀 | **적절** (native 충분 영역은 Promotion 활용, "쿠폰함/발급이력" 한국형만 보강) | 유지 |
| 포인트 | native·plugin 미존재 → 자체 원장 모듈 | **불가피** (native 부재 실증) | 유지 |
| 주문 상태 | native status 6종 유지 + 한국 11종은 state-machine 모듈 분리(컬럼 추가 안 함, 파생 표시) | **적절** (DB 컬럼 추가 회피 = 과설계 방지 명시) | 유지 |
| 회원 휴면계정 | 2024 폐지법 정합 → **신설 안 함** | **적절** (오히려 과설계 회피 사례) | 유지 |
| 관리자 RBAC | native `user`/`invite`/rbac(테이블 존재) 위에 `admin_role`/`admin_permission`/`admin_role_permission`/`admin_profile` **4테이블 커스텀** | **과설계 의심(MAJOR 연계)** — native rbac 모듈(`user_rbac_role` 테이블)이 이미 존재하는데 별도 RBAC 2-테이블 + 매핑 테이블 + 프로필 보완을 신설. MVP 4-role 고정이면 native rbac role 매핑 + `user.metadata` 로 충분할 수 있음 | native `@medusajs/rbac` 의 역할 모델 활용 가능 범위를 PL 단계에서 실측 후, scope×action 세분 권한이 **실제 필요한 시점까지 커스텀 RBAC 도입 보류** 권장 |
| 장바구니 라인 메타 | 별도 `cart_item_kr_meta` 1:1 모델 + defineLink | **과설계 의심(MAJOR 기재)** — native `LineItem.metadata` 로 충분, 문서도 미결로 인정 | native metadata 우선, 성능 실측 후 결정 |

> **명백한 과설계로 차단할 BLOCKER 0건.** 단 관리자 RBAC·장바구니 라인 메타 2건은 MVP 기준 native 흡수 우선 재검토 권장(MAJOR 연계).

---

## 6. 마이그레이션 리스크 검증 (항목 5)

| 리스크 | 실증 | 판정 |
|---|---|---|
| model.json/관계가 `db:generate` 가능한 형태인가 | 전 설계가 `model.define()` + MikroORM 마이그레이션(legal-kr/rma/state-machine/product-type 선례 4종 실재) 패턴 인용 → 생성 가능 | OK |
| 부분 인덱스(`WHERE ... IS NULL`) | Medusa DML `indexes([{where}])` 지원(legal-kr UNIQUE 인덱스 선례). 위시 Q-WIS-08 의 "raw SQL 필요 가능성" 은 과한 우려 | OK (MINOR 정정) |
| CHECK / BEFORE INSERT 트리거 | CHECK = DML `.checks()` 지원(리뷰 rating·포인트 balance), 누적 검증 트리거만 raw SQL — 결제/쿠폰 설계가 정확히 분리 기술 | OK |
| 잔존 테이블 정리 | 실 DB 에 구 `category_option_template` + 신 `product_type_*` 공존 → product-type 진화 마이그레이션 시 구 테이블 drop 누락 리스크 | MINOR (drop 마이그레이션 명시 필요) |
| link 테이블 생성 | `db:migrate`/`db:sync-links` 로 link 테이블 자동 생성(실 DB 4개 link 테이블 확인) | OK |

> **마이그레이션 차단(BLOCKER) = 0건.** 잔존 테이블 정리(MINOR) 1건.

---

## 7. 종합 판정

| 구분 | 건수 |
|---|---|
| BLOCKER | **0** |
| MAJOR | **3** |
| MINOR | **4** |
| INFO | 1 |

- **§6 native 매핑 실재성**: 10개 설계 전부 PASS (허위 native 0건). `Order.custom_display_id`·MFA 모델·promotion 자동로드·refund.metadata 등 "있다고 한 것" 모두 실 DB/런타임으로 확인됨.
- **테이블명 충돌**: 0건 (link 테이블 `{module}_{model}` 자동 네임스페이스 + 커스텀 명 회피).
- **격리 패턴**: 전 도메인 legal-kr 패턴 정합 (코어 무수정 확인).
- **재검토 권장(MAJOR)**: ① auth-google/payment-stripe "별도 설치" 표현 정정 ② 관리자 RBAC 커스텀 4테이블 — native rbac 활용 범위 실측 후 보류 검토 ③ 장바구니 라인 1:1 메타 모델 — native LineItem.metadata 흡수 우선.

---

## 8. 최중대 3건 요약

1. **[MAJOR · 결제/회원] auth-google·payment-stripe "별도 패키지 설치 확인" = 사실 오류.**
   `package.json` 에 두 패키지 없음. `@medusajs/medusa` 번들 내 서브패스(`@medusajs/medusa/auth-google`)로만 resolve. 기능은 가용하나 import 경로·"설치됨" 문구 정정 필요. payment-stripe 는 미사용이므로 설치 주장 삭제.

2. **[MAJOR · 관리자] RBAC 커스텀 4테이블 과설계 의심.**
   native `@medusajs/rbac` 모듈이 이미 활성(`user_rbac_role`·`invite_rbac_role` 테이블 실재)인데, 문서는 이를 "feature-flag 미확정"으로 오판하고 `admin_role`+`admin_permission`+`admin_role_permission`+`admin_profile` 4테이블 신설. MVP 4-role 이면 native rbac + metadata 로 충분할 수 있음 → 세분 권한(scope×action) 실수요 발생 전까지 커스텀 RBAC 도입 보류 권장.

3. **[MAJOR · 장바구니] 카트 라인 1:1 메타 모델 + defineLink 과설계.**
   `price_at_add`/`selected`/`version` 을 위해 `cart_item_kr_meta` 별도 테이블 + 라인 단위 1:1 link 신설은 휘발성 임시 버퍼인 카트에 과한 인프라(link 테이블 행수 = 누적 카트라인 폭증). native `LineItem.metadata` 흡수 우선, 성능 실측 후 분리 결정 권장. (문서 §8 스스로 미결로 인정한 항목.)
