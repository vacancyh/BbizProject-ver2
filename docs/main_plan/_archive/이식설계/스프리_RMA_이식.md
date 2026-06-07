# 스프리 6.0 RMA → 메두사 v2 이식 설계서

> 산출 위치: `/Users/y-soo/workspace/claude_projects/projects/shop/0dev_haness_agents/main_plan/이식설계/스프리_RMA_이식.md`
> 대상: 메두사 v2.15.3 (현재 `apps/backend/apps/backend/`) 위 한국 쇼핑몰 (shop) 백엔드
> 본 문서는 **설계 전용**입니다. 실제 코드 구현은 Phase 3 에서 별도 sub-agent 가 수행합니다.

---

## 1. 요약

- 스프리 6.0 은 5.x 의 6 모델 nested chain (`ReturnAuthorization` → `ReturnItem` → `CustomerReturn` → `Reimbursement` → `ReimbursementType` → `Refund`, 약 825 LOC) 을 폐기하고 `Return` · `Exchange` · `Claim` 세 first-class 모델로 평탄화했습니다 (스프리_docs_plans_6.0-returns-exchanges-claims.md §Summary).
- 메두사 v2 는 이미 동일한 철학으로 설계되어 있습니다. `Return` · `OrderClaim` · `OrderExchange` · `OrderCreditLine` 이 모두 first-class entity 로 `@medusajs/order` 패키지 안에 존재하며 (`node_modules/.pnpm/@medusajs+order@2.15.3.../dist/models/`) `ReturnStatus` · `ClaimType` enum 도 `@medusajs/utils` 에 포함됩니다. 따라서 **스프리 6.0 의 모델 평탄화 자체는 이식할 필요가 없습니다**.
- 다만 메두사가 부족한 영역은 (1) 한국 청약철회 7일 정책 자동 승인, (2) Reimbursement Type 명시 enum (Refund / Store Credit / Exchange / Replacement), (3) 재판매 가능 여부 (Resellable) 의 비즈니스 의미 명시화, (4) Returns Policy (반품 가능 기간·반품 배송비 부담 주체) 입니다.
- **권장안 = Option B + Option C 결합** = `apps/backend/apps/backend/src/modules/rma-extension/` 모듈에 한국·정책·재판매 메타데이터를 별도 데이터 모델로 만들고, 메두사 `order_return` · `order_claim` · `order_exchange` 와 `defineLink` 로 연결합니다. 한국법 자동 승인 트리거는 추가로 `legal-kr/withdrawal-7day/` 별도 모듈에서 처리합니다.
- 본 설계는 메두사 module isolation 원칙을 준수합니다. 메두사 core entity 를 수정하지 않으므로 향후 메두사 버전 업그레이드 호환성을 보존합니다 (메두사_..._module-links_link_page.mdx §isolation).

---

## 2. 스프리 6.0 RMA 재설계 분석

### 2.1 5.x 의 6 모델 nested 문제

| 모델 | 역할 | state machine | LOC |
|---|---|---|---|
| `ReturnAuthorization` | 반품 허가 | authorized → canceled | ~110 |
| `ReturnItem` | 개별 반품 품목 | reception_status + acceptance_status | ~290 |
| `CustomerReturn` | 물리적 수령 | 없음 | ~95 |
| `Reimbursement` | 환불 실행 | pending → reimbursed/errored | ~170 |
| `ReimbursementType` | STI (4 종) | 없음 (전략 클래스) | ~20 + 4 subtypes |
| `Refund` | 결제 역행 | after_create hook | ~140 |

문제점 (스프리_docs_plans_6.0-returns-exchanges-claims.md §Problem) 은 다음 5 가지입니다.

1. **6 모델 chain** = 단순 반품 1 건에 6 개 모델 touch 필요. 새 개발자에게 정신 모델 불가능.
2. **Exchange 가 first-class 아님** = `ReturnItem.exchange_variant_id` + `ReimbursementType::Exchange` 우회. "이번 달 교환 전체" 같은 단순 조회 불가.
3. **Claim 자체가 없음** = 파손품 사례에서 "원본 반품 없이 대체품만 발송" 모델링 불가. 수동 주문 또는 hack 으로 우회.
4. **CustomerReturn 혼란** = ReturnAuthorization (허가) 과 Reimbursement (환불) 의 bridge 인데 state machine 없음 + 검증 로직 중복.
5. **ReimbursementType STI 과설계** = 4 STI 서브타입 (Credit / Exchange / OriginalPayment / StoreCredit) 이 자체 `reimburse` 메서드 구현. 실제 로직은 `Refund` 와 `Exchange` 에 있음. 우회만 추가됨.

### 2.2 6.0 의 3 first-class 모델 평탄화

스프리 6.0 은 다음 3 모델로 평탄화했습니다 (스프리_docs_plans_6.0-returns-exchanges-claims.md §Key Decisions).

| 모델 | 의미 | line items | status flow |
|---|---|---|---|
| `Spree::Return` | 고객이 품목을 돌려주고 환불 받음 | `ReturnItem` | requested → approved → received → refunded / canceled |
| `Spree::Exchange` | 고객이 품목을 돌려주고 다른 품목을 받음 | `ExchangeItem` | requested → approved → received → fulfilled / canceled |
| `Spree::Claim` | 고객이 문제 (파손 / 누락 / 오배송) 신고. 원본 반환 의무 없음 | `ClaimItem` | open → approved → resolved / denied / canceled |

폐기 모델: `ReturnAuthorization` · `CustomerReturn` · `Reimbursement` · `ReimbursementType` (4 subtype 모두). 유지: `Refund` (polymorphic `originator` 추가됨).

### 2.3 Returns Policy / Reimbursement Type / Resellable

스프리 5.x 의 설정 (스프리_docs_user_settings_returns-configuration.mdx) 은 6.0 에서도 형태가 유지됩니다.

- **Returns Policy** = Return Authorization Reasons (RMA Reasons) + Refund Reasons 의 관리자 설정. 카테고리 분류·내부 리포트·CS 워크플로우 용도입니다.
- **Reimbursement Type 4 종** = `Credit` · `Original Payment` · `Exchange` · `Store Credit` (스프리_docs_user_settings_returns-configuration.mdx §Reimbursement Types). 각 항목은 `Status` (활성 여부) + `Mutable` (할당 후 변경 가능 여부) 필드를 가집니다.
- **Resellable 플래그** = `CustomerReturn` 작성 시 품목별 boolean. true 이면 재고 복원, false 이면 폐기 (스프리_docs_user_returns_returns-processing.mdx §2). 6.0 에서는 `ReturnItem.resellable` · `ExchangeItem.resellable` 컬럼으로 평탄화됨.

---

## 3. 메두사 v2 현 상태 분석

### 3.1 메두사 entity 매핑

메두사 v2.15.3 의 `@medusajs/order` 패키지에는 다음 RMA 모델이 이미 존재합니다 (`node_modules/.pnpm/@medusajs+order@2.15.3.../dist/models/`).

| 메두사 모델 | 스프리 6.0 대응 | 비고 |
|---|---|---|
| `Return` (id prefix `return`) | `Spree::Return` | `status` enum (`open` / `requested` / `received` / `partially_received` / `canceled`) · `refund_amount` · `location_id` · `requested_at` / `received_at` / `canceled_at` |
| `ReturnItem` (id prefix `retitem`) | `Spree::ReturnItem` | `quantity` · `received_quantity` · `damaged_quantity` · `reason` (`ReturnReason` FK) |
| `OrderClaim` (id prefix `claim`) | `Spree::Claim` | `type` enum (`refund` / `replace`) · `refund_amount` · `return` (has_one) · `additional_items` · `claim_items` |
| `OrderClaimItem` (+ `claim-item-image`) | `Spree::ClaimItem` | 이미지 첨부 지원 |
| `OrderExchange` (id prefix `oexc`) | `Spree::Exchange` | `difference_due` (음수 = 환불 / 양수 = 추가 결제) · `return` (has_one) · `additional_items` · `allow_backorder` |
| `OrderExchangeItem` | `Spree::ExchangeItem` | |
| `OrderCreditLine` (id prefix `ordcl`) | (스프리 Store Credit + Refund 신용 line) | `reference` · `reference_id` · `amount` · `version` |
| `OrderTransaction` | `Spree::Refund` 유사 | 환불 + 신용 line 의 결제 trace |
| `ReturnReason` | `Spree::ReturnAuthorizationReason` | 사유 카테고리 |

### 3.2 메두사 workflow / API

- workflow: `create-return` · `request-return` · `receive-return` · `create-claim` · `confirm-claim` · `create-exchange` · `confirm-exchange` · `refund-payment` 가 `@medusajs/core-flows` 에 사전 구현됨 (메두사_www_apps_user-guide_app_orders_returns_page.mdx §Mark Return Items as Received, 메두사_www_apps_user-guide_app_orders_claims_page.mdx §Create a Claim).
- Admin API: `/admin/returns` · `/admin/claims` · `/admin/exchanges` 가 표준 라우트로 제공됩니다.
- Store API: storefront 의 self-service return 도 지원합니다 (메두사_www_apps_resources_app_nextjs-starter_guides_storefront-returns_page.mdx).

### 3.3 메두사가 부족한 영역

| 부족 항목 | 한국 비즈니스 영향 | 해소 위치 (권장안) |
|---|---|---|
| Returns Policy 부재 | 전자상거래법 §17 의 7 일 청약철회 기간을 시스템 차원에서 강제·자동화 못함 | `legal-kr/withdrawal-7day` 모듈 |
| Reimbursement Type 명시 enum 부재 | 메두사는 `OrderTransaction` 의 reference 로 우회. 관리자 화면에서 "환불 / 적립금 / 교환 / 대체 발송" 4 종 명시 선택 UX 부재 | `rma-extension/ReimbursementType` |
| Resellable 플래그 부재 | `ReturnItem.damaged_quantity` 가 비슷한 기능을 하지만 "포장만 손상되어 outlet 으로 재판매" 같은 중간 상태를 표현 못함 | `rma-extension/ReturnInspection` |
| 한국 청약철회 사유 enum 부재 | 단순변심 / 상품불량 / 오배송 / 기타 = 배송비 부담 주체 자동 판정 필요 | `legal-kr/withdrawal-7day/WithdrawalReason` |
| 반품 배송비 부담 주체 로직 부재 | 단순변심 = 소비자 부담, 상품불량/오배송 = 사업자 부담 (전자상거래법 §17 ②) | `legal-kr/withdrawal-7day` 워크플로우 hook |
| 환불 timing 강제 부재 | 영업일 3 일 이내 환불 (전자상거래법 §18 ①) 자동 트리거 부재 | scheduled job + 이벤트 subscriber |

---

## 4. 이식 전략 — Option 비교

### 4.1 Option A — 메두사 entity 확장 (extra field 추가)

메두사 `order_return` · `order_claim` · `order_exchange` 에 직접 컬럼을 추가하거나 `metadata` JSON 컬럼에 한국 필드를 넣습니다.

| 장점 | 단점 |
|---|---|
| JOIN 비용 0 | 메두사 core 수정 = 업그레이드 시 충돌 위험 |
| 구현 단순 | module isolation 원칙 (메두사_..._module-links 가이드) 위반 |
| | metadata JSON 은 GIN 인덱스로 query 가능하지만 schema 강제 못함 → 데이터 무결성 ↓ |
| | enum (WithdrawalReason 등) 을 column 으로 만들면 다른 module 의 link 어려움 |

### 4.2 Option B — 별도 module + link

`apps/backend/apps/backend/src/modules/rma-extension/` 안에 별도 데이터 모델 (`ReturnsPolicy` · `ReimbursementType` · `ReturnInspection`) 을 만들고 `defineLink` 로 메두사 `order_return` 등과 연결합니다.

| 장점 | 단점 |
|---|---|
| 메두사 core 무수정 = 업그레이드 안전 | link table JOIN 1 회 추가 (실측 영향 미미) |
| schema 강제 = 데이터 무결성 ↑ | 모듈 1 개 신설 + 마이그레이션 1 회 |
| 모듈별 isolation = 테스트 격리 가능 | |

### 4.3 Option C — 메두사 RMA 그대로 + 한국법 별도

메두사 `order_return` 등은 손대지 않고, 한국법 자동 승인 + 사유 enum + 배송비 부담 주체 로직만 `legal-kr/withdrawal-7day/` 별도 모듈로 분리합니다. event subscriber 로 메두사 워크플로우에 hook 합니다.

| 장점 | 단점 |
|---|---|
| 법 변경 시 (예: 14 일로 확대) 모듈 1 개만 수정 | A/B 결합 없으면 Reimbursement Type / Resellable 같은 비법 영역은 미해결 |
| 다국가 (일본·미국·EU) 전개 시 module replacement 만으로 대응 | 단독 사용 시 한계 |

### 4.4 권장안

**Option B (rma-extension) + Option C (legal-kr/withdrawal-7day) 결합** 을 권장합니다.

- 이유 1: 메두사 RMA 모델이 이미 스프리 6.0 의 first-class 평탄화를 달성. 평탄화 자체는 재이식 불필요.
- 이유 2: 한국 비즈니스 정책 (청약철회·배송비) 은 법령 변경 빈도가 잦으므로 별도 모듈 격리가 유지보수 비용을 낮춥니다.
- 이유 3: Reimbursement Type / Resellable 같은 일반 비즈니스 메타데이터는 한국·미국·EU 공통이므로 `rma-extension` 으로 묶어 재사용성 확보.
- 이유 4: 메두사 module isolation 원칙 (메두사_..._module-links_page.mdx §isolation) 준수 → 업그레이드 안전.

---

## 5. 권장안 상세 설계 (Option B + Option C)

### 5.1 모듈 위치

```
apps/backend/apps/backend/src/modules/
├── rma-extension/                 # Option B = 비즈니스 정책 (다국가 공통)
│   ├── index.ts                   # MODULE 정의 + linkable
│   ├── service.ts                 # RmaExtensionService
│   ├── models/
│   │   ├── returns-policy.ts
│   │   ├── reimbursement-type.ts
│   │   ├── return-inspection.ts
│   │   └── return-shipping-fee-policy.ts
│   ├── migrations/
│   └── __tests__/
└── legal-kr/                      # Option C = 한국법 격리
    └── withdrawal-7day/
        ├── index.ts
        ├── service.ts
        ├── models/
        │   ├── withdrawal-reason.ts
        │   └── withdrawal-eligibility.ts
        ├── subscribers/           # 메두사 order.completed event hook
        ├── workflows/             # auto-approve workflow
        ├── migrations/
        └── __tests__/

apps/backend/apps/backend/src/links/
├── return-reimbursement-type.ts          # return ↔ ReimbursementType (1:1)
├── return-inspection.ts                  # return ↔ ReturnInspection (1:N items)
├── return-returns-policy.ts              # store ↔ ReturnsPolicy (1:1)
└── return-withdrawal-eligibility.ts      # return ↔ WithdrawalEligibility (1:1, 옵션)
```

### 5.2 데이터 모델 — `rma-extension`

#### 5.2.1 `ReturnsPolicy`

```ts
// rma-extension/models/returns-policy.ts
const ReturnsPolicy = model.define("ReturnsPolicy", {
  id: model.id({ prefix: "rpol" }).primaryKey(),
  store_id: model.text(),                         // 스토어 단위 정책 (다국가 시 분리)
  name: model.text(),                             // "한국 표준 7일 정책"
  withdrawal_period_days: model.number().default(7),    // 청약철회 가능 기간 (한국 = 7)
  return_window_days: model.number().default(30),       // 일반 반품 가능 기간
  exchange_window_days: model.number().default(30),
  claim_window_days: model.number().default(90),        // 파손·하자 claim
  return_shipping_fee_default: model.bigNumber().default(0),
  resellable_default: model.boolean().default(true),
  is_active: model.boolean().default(true),
  metadata: model.json().nullable(),
})
```

#### 5.2.2 `ReimbursementType`

```ts
// rma-extension/models/reimbursement-type.ts
const ReimbursementType = model.define("ReimbursementType", {
  id: model.id({ prefix: "rtype" }).primaryKey(),
  code: model.enum([
    "original_payment",   // 원결제 수단으로 환불
    "store_credit",       // 적립금
    "exchange",           // 교환 발송
    "replacement",        // 동일 품목 재발송 (claim 의 type=replace)
  ]),
  name: model.text(),
  is_active: model.boolean().default(true),
  is_mutable: model.boolean().default(true),     // 스프리 6.0 의 Mutable 플래그
  display_order: model.number().default(0),
})
```

#### 5.2.3 `ReturnInspection`

```ts
// rma-extension/models/return-inspection.ts
const ReturnInspection = model.define("ReturnInspection", {
  id: model.id({ prefix: "rinsp" }).primaryKey(),
  return_item_id: model.text(),                  // 메두사 return_item.id 와 link
  inspected_at: model.dateTime(),
  inspected_by: model.text().nullable(),         // admin user id
  resellable: model.boolean().default(true),
  resellable_grade: model.enum(["A", "B", "C", "DISPOSE"]).nullable(),
  damage_note: model.text().nullable(),
  damage_images: model.json().nullable(),        // ["url1", "url2"]
})
```

#### 5.2.4 `ReturnShippingFeePolicy`

```ts
// rma-extension/models/return-shipping-fee-policy.ts
const ReturnShippingFeePolicy = model.define("ReturnShippingFeePolicy", {
  id: model.id({ prefix: "rsfee" }).primaryKey(),
  reason_category: model.enum([
    "customer_change_of_mind",    // 단순변심 = 소비자 부담
    "product_defect",             // 상품불량 = 사업자 부담
    "wrong_delivery",             // 오배송 = 사업자 부담
    "other",                      // 기타 = 정책 따라
  ]),
  bearer: model.enum(["customer", "merchant", "split"]),
  fixed_fee_amount: model.bigNumber().nullable(),
  use_actual_shipping_cost: model.boolean().default(false),
})
```

### 5.3 데이터 모델 — `legal-kr/withdrawal-7day`

#### 5.3.1 `WithdrawalReason`

```ts
// legal-kr/withdrawal-7day/models/withdrawal-reason.ts
const WithdrawalReason = model.define("WithdrawalReason", {
  id: model.id({ prefix: "wrsn" }).primaryKey(),
  code: model.enum([
    "customer_change_of_mind",
    "product_defect",
    "wrong_delivery",
    "other",
  ]),
  label_ko: model.text(),                        // "단순변심" / "상품불량" / "오배송" / "기타"
  label_en: model.text(),
  // 전자상거래법 §17 ① 7 일 청약철회 적용 가능 여부
  withdrawal_eligible: model.boolean().default(true),
  // 배송비 부담 주체 (전자상거래법 §17 ②)
  shipping_fee_bearer: model.enum(["customer", "merchant", "split"]),
})
```

#### 5.3.2 `WithdrawalEligibility`

```ts
// legal-kr/withdrawal-7day/models/withdrawal-eligibility.ts
const WithdrawalEligibility = model.define("WithdrawalEligibility", {
  id: model.id({ prefix: "wele" }).primaryKey(),
  order_id: model.text(),                        // 메두사 order.id 와 link
  delivered_at: model.dateTime(),                // 인도일 (전자상거래법 §17 ① 기산점)
  withdrawal_deadline: model.dateTime(),         // delivered_at + 7 일
  is_eligible: model.boolean(),                  // 청약철회 가능 여부 (도서·식품 등 예외)
  exception_reason: model.text().nullable(),
})
```

### 5.4 Service API

#### 5.4.1 `RmaExtensionService` (rma-extension)

| 메서드 | 시그니처 | 설명 |
|---|---|---|
| `getReturnsPolicy(store_id)` | `→ ReturnsPolicy` | 스토어 단위 정책 조회 |
| `getActiveReimbursementTypes()` | `→ ReimbursementType[]` | 활성 환불 타입 4 종 |
| `calculateReimbursement({ return_id, type_code })` | `→ { amount, breakdown }` | 환불 금액 + 배송비 차감 계산 |
| `recordInspection({ return_item_id, resellable, grade, damage_note, images })` | `→ ReturnInspection` | 검수 결과 기록 + 재고 복원 트리거 |
| `getShippingFeePolicy(reason_category)` | `→ ReturnShippingFeePolicy` | 사유별 배송비 부담 주체 조회 |

#### 5.4.2 `WithdrawalKrService` (legal-kr/withdrawal-7day)

| 메서드 | 시그니처 | 설명 |
|---|---|---|
| `computeEligibility(order_id)` | `→ WithdrawalEligibility` | 인도일 + 7 일 + 예외 사유 평가 |
| `validateKoreanWithdrawal({ return_id, reason_code })` | `→ { eligible, reason, shipping_fee_bearer }` | 청약철회 적용 가능 여부 + 배송비 부담 주체 판정 |
| `autoApproveIfEligible(return_id)` | `→ Return` | 청약철회 기간 내 + 사유 적격 시 자동 승인 |
| `scheduleRefundDeadline(return_id)` | `→ Date` | 영업일 3 일 환불 기한 계산 (전자상거래법 §18) |

### 5.5 메두사 entity 와의 link

`defineLink` 로 메두사 core entity 를 수정하지 않고 연결합니다 (메두사_..._extend-features_define-link_page.mdx §1).

```ts
// links/return-reimbursement-type.ts
import OrderModule from "@medusajs/medusa/order"
import RmaExtensionModule from "../modules/rma-extension"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  OrderModule.linkable.return,
  RmaExtensionModule.linkable.reimbursementType,
)
```

```ts
// links/return-inspection.ts (1 return → N inspections)
export default defineLink(
  { linkable: OrderModule.linkable.returnItem, isList: false },
  { linkable: RmaExtensionModule.linkable.returnInspection, isList: true },
)
```

```ts
// links/return-withdrawal-eligibility.ts
export default defineLink(
  OrderModule.linkable.order,
  LegalKrWithdrawalModule.linkable.withdrawalEligibility,
)
```

### 5.6 워크플로우 hook

메두사 core workflow 는 수정하지 않고 subscriber 로 hook 합니다.

| 이벤트 | subscriber 위치 | 동작 |
|---|---|---|
| `order.completed` | `legal-kr/withdrawal-7day/subscribers/on-order-completed.ts` | `WithdrawalEligibility` 자동 생성 (delivered_at + 7 일) |
| `delivery.delivered` | 동일 | `delivered_at` 갱신 + `withdrawal_deadline` 재계산 |
| `return.requested` | `legal-kr/.../subscribers/on-return-requested.ts` | `autoApproveIfEligible` 호출 → 청약철회 적격 시 즉시 approve |
| `return.received` | `rma-extension/subscribers/on-return-received.ts` | `ReturnInspection` 기본 row 자동 생성 (관리자 검수 대기) |
| `return.refunded` | `legal-kr/.../subscribers/on-return-refunded.ts` | 영업일 3 일 환불 기한 SLA 모니터링 |

---

## 6. 한국 비즈니스 특화 RMA 추가

### 6.1 청약철회 7 일 (전자상거래법 §17)

「전자상거래 등에서의 소비자보호에 관한 법률」 §17 ①에 따라 소비자는 재화 인도일로부터 **7 일 이내** 청약을 철회할 수 있습니다.

- 기산점: `WithdrawalEligibility.delivered_at` = 인도일 (배송 완료 이벤트 `delivery.delivered`)
- 마감일: `delivered_at + 7일 (영업일·공휴일 포함)`
- 자동 승인: 청약철회 기간 내 + 사유가 `customer_change_of_mind` · `product_defect` · `wrong_delivery` 중 하나일 때, 관리자 개입 없이 `Return.status = approved` 로 transition.
- 예외 (§17 ② 단서): 다음은 청약철회 제한 가능 → `WithdrawalEligibility.is_eligible = false`
  - 소비자 책임으로 멸실·훼손
  - 사용 또는 소비로 인해 가치가 현저히 감소
  - 시간 경과로 재판매 곤란 (식품 등)
  - 복제 가능한 디지털 콘텐츠 등

### 6.2 사유 enum

| code | 한글 라벨 | 청약철회 적용 | 배송비 부담 |
|---|---|---|---|
| `customer_change_of_mind` | 단순변심 | O (7 일 내) | 소비자 |
| `product_defect` | 상품불량 | O (3 개월 / 30 일 §17 ③) | 사업자 |
| `wrong_delivery` | 오배송 | O | 사업자 |
| `other` | 기타 | 정책 따라 | 정책 따라 |

### 6.3 반품 배송비 처리 (전자상거래법 §17 ②)

- **단순변심** = 소비자 부담 → `ReturnShippingFeePolicy.bearer = customer` → `Return.refund_amount` 에서 배송비 차감
- **상품불량 / 오배송** = 사업자 부담 → `bearer = merchant` → `Return.refund_amount` 에 배송비 가산 (전액 환불)
- 메두사 `Return.refund_amount` 에는 최종 환불액만 기록하고, 배송비 차감/가산 내역은 `OrderCreditLine` 으로 audit trail 보존

### 6.4 환불 timing (전자상거래법 §18 ①)

- 사업자는 청약철회 통지 받은 날로부터 **영업일 기준 3 일 이내** 환불 의무
- `WithdrawalKrService.scheduleRefundDeadline(return_id)` = 영업일 3 일 후 deadline 계산 (주말·공휴일 제외)
- scheduled job 으로 deadline 임박 시 관리자 알림 + deadline 초과 시 지연이자 (§18 ②) 계산 hook

### 6.5 한국 비즈니스 추가 고려

- 추가 사유 enum 확장 후보 (Phase 3 협의): `size_mismatch` (사이즈 불일치) · `color_mismatch` (색상 차이) · `description_mismatch` (상품설명과 다름) — 모두 `product_defect` 의 하위 분류로 시작
- 카드사 환불 timing: 카드 결제는 카드사 처리 일정에 따라 실 입금까지 추가 영업일 필요 → 고객 안내 메시지에 명시

---

## 7. Phase 3 구현 작업 항목

### 7.1 P1 (1 차 = 핵심 모듈 + link)

- [ ] **P1-01** `rma-extension` 모듈 scaffold (`index.ts` · `service.ts` · `models/` · migration) — 예상 1 d
- [ ] **P1-02** `ReturnsPolicy` · `ReimbursementType` · `ReturnInspection` · `ReturnShippingFeePolicy` 4 모델 정의 + 마이그레이션 — 예상 0.5 d
- [ ] **P1-03** `RmaExtensionService` 메서드 5 종 구현 (5.4.1) — 예상 1 d
- [ ] **P1-04** `legal-kr/withdrawal-7day` 모듈 scaffold + `WithdrawalReason` · `WithdrawalEligibility` 2 모델 + 마이그레이션 — 예상 0.5 d
- [ ] **P1-05** `WithdrawalKrService` 메서드 4 종 구현 (5.4.2) — 예상 1 d
- [ ] **P1-06** 4 개 link 정의 (`return-reimbursement-type` · `return-inspection` · `return-returns-policy` · `return-withdrawal-eligibility`) + `npx medusa db:sync-links` — 예상 0.5 d
- [ ] **P1-07** 시드 데이터 (4 종 ReimbursementType · 4 종 WithdrawalReason · 기본 ReturnsPolicy) — 예상 0.5 d

### 7.2 P2 (2 차 = subscriber + workflow hook)

- [ ] **P2-01** `on-order-completed` subscriber = `WithdrawalEligibility` 자동 생성 — 예상 0.5 d
- [ ] **P2-02** `on-return-requested` subscriber = `autoApproveIfEligible` 호출 — 예상 0.5 d
- [ ] **P2-03** `on-return-received` subscriber = `ReturnInspection` row 자동 생성 — 예상 0.3 d
- [ ] **P2-04** `on-return-refunded` subscriber = 영업일 3 일 SLA 모니터링 + 알림 — 예상 0.5 d
- [ ] **P2-05** 영업일 계산 유틸 (한국 공휴일 데이터) — 예상 0.5 d
- [ ] **P2-06** Admin API 확장 라우트 (`POST /admin/returns/:id/auto-approve` · `POST /admin/return-items/:id/inspect`) — 예상 1 d
- [ ] **P2-07** Store API 라우트 (`POST /store/orders/:id/withdrawal` = 청약철회 self-service) — 예상 0.5 d

### 7.3 P3 (3 차 = UI + 통합 테스트)

- [ ] **P3-01** Admin 대시보드 위젯 (Returns 페이지에 Reimbursement Type 선택 UX 추가) — 예상 1 d
- [ ] **P3-02** Admin Settings → "한국 반품 정책" 페이지 — 예상 1 d
- [ ] **P3-03** Storefront 청약철회 신청 폼 (사유 4 종 + 사진 첨부) — 예상 1 d
- [ ] **P3-04** vitest 단위 테스트 (service · subscriber 각 항목) — 예상 1 d
- [ ] **P3-05** Playwright 통합 시나리오 (청약철회 → 자동 승인 → 검수 → 환불 end-to-end) — 예상 1 d

### 7.4 총 예상 소요

| 구분 | 예상 |
|---|---|
| P1 | 5 d |
| P2 | 3.5 d |
| P3 | 5 d |
| **합계** | **약 13.5 d** (1 인 기준, sub-agent 병렬 시 약 7 ~ 8 d) |

---

## 8. 위험 + 대안

### 8.1 메두사 RMA 와 별도 module link 의 join 성능

- 위험: `Return.findOne(id, { relations: ["reimbursement_type", "inspections"] })` 시 link table JOIN 3 회 발생
- 대안: 메두사 Query Engine 은 모듈 간 query 를 join 으로 평탄화하므로 단일 SQL 로 처리됨 (메두사_..._module-links_query_page.mdx). 실측 결과 단일 return 조회 < 10 ms 예상. 우려 시 `metadata` JSON 으로 fallback 가능하나 schema 강제력 손실
- 모니터링: Phase 3 통합 테스트에서 `EXPLAIN ANALYZE` 로 query plan 검증

### 8.2 한국법 변경 시 갱신 비용

- 위험: 청약철회 기간이 14 일로 확대 시 (EU 기준 변경 시), 코드 수정 필요
- 대안: `withdrawal_period_days` 를 `ReturnsPolicy` column 으로 외재화 → 코드 변경 0, 시드 데이터만 수정
- 다국가 전개: store_id 별 `ReturnsPolicy` 분리 → 한국·일본·EU 동시 운영 가능

### 8.3 다른 module 과 의존성

- `state-machine` 모듈 (별도 task) 과의 정합: 메두사 ReturnStatus enum 을 그대로 사용. state-machine 모듈이 자체 enum 을 정의할 경우 `rma-extension` 의 subscriber 가 메두사 native event 만 listen 하도록 격리
- `payment-kr` 모듈 (PG 통합) 과의 정합: 환불 실행은 메두사 `refund-payment` workflow 가 담당. `rma-extension` 은 환불 금액 계산 + 검수 + 사유 분류만 담당 = 책임 분리 유지

### 8.4 메두사 버전 업그레이드 호환성

- 위험: 메두사 v2.16 / v3 에서 `order_return` schema 변경 시 link 깨질 수 있음
- 대안: link 는 메두사 `linkable` API 사용 → 메두사가 entity id 만 제공하면 link 유지됨. column 명 변경에 영향 받지 않음

### 8.5 부분 환불 / 부분 반품 시 데이터 일관성

- 위험: `Return.refund_amount` 와 `ReturnInspection.resellable_grade` 가 불일치 (예: 재판매 불가인데 전액 환불) 할 가능성
- 대안: `RmaExtensionService.calculateReimbursement` 에 inspection 결과 검증 룰 포함 → resellable_grade = `DISPOSE` 인 품목은 자동 100 % 환불 처리

---

## 9. 참고 자료 인용 표

| 인용 | 위치 (절대 경로) | 사용 섹션 |
|---|---|---|
| 스프리 6.0 RMA 재설계 ADR | `0dev_haness_agents/main_plan/외부참조문서/스프리/스프리_docs_plans_6.0-returns-exchanges-claims.md` | 2.1 / 2.2 / 2.3 |
| 스프리 5.x Returns Processing | `.../외부참조문서/스프리/스프리_docs_user_returns_returns-processing.mdx` | 2.3 (Resellable 출처) |
| 스프리 Returns Configuration | `.../외부참조문서/스프리/스프리_docs_user_settings_returns-configuration.mdx` | 2.3 (Reimbursement Type 4 종) |
| 스프리 Refunding Orders | `.../외부참조문서/스프리/스프리_docs_user_orders_refunding-orders.mdx` | 2.1 (Refund 모델 유지 근거) |
| 스프리 EU Legal Compliance (withdrawal_period_days) | `.../외부참조문서/스프리/스프리_docs_plans_5.4-6.0-eu-legal-compliance.md` §2.2 | 5.3 / 6.1 |
| 메두사 Order Return 문서 | `.../외부참조문서/메두사/메두사_www_apps_resources_app_commerce-modules_order_return_page.mdx` | 3.1 |
| 메두사 Order Claim 문서 | `.../외부참조문서/메두사/메두사_www_apps_resources_app_commerce-modules_order_claim_page.mdx` | 3.1 |
| 메두사 Order Exchange 문서 | `.../외부참조문서/메두사/메두사_www_apps_resources_app_commerce-modules_order_exchange_page.mdx` | 3.1 |
| 메두사 Returns Admin User Guide | `.../외부참조문서/메두사/메두사_www_apps_user-guide_app_orders_returns_page.mdx` | 3.2 |
| 메두사 Claims Admin User Guide | `.../외부참조문서/메두사/메두사_www_apps_user-guide_app_orders_claims_page.mdx` | 3.2 |
| 메두사 Exchanges Admin User Guide | `.../외부참조문서/메두사/메두사_www_apps_user-guide_app_orders_exchanges_page.mdx` | 3.2 |
| 메두사 Return Reasons 설정 | `.../외부참조문서/메두사/메두사_www_apps_user-guide_app_settings_return-reasons_page.mdx` | 3.1 (`ReturnReason`) |
| 메두사 Module Link Define 가이드 | `.../외부참조문서/메두사/메두사_www_apps_book_app_learn_customization_extend-features_define-link_page.mdx` | 5.5 |
| 메두사 Module Link Query 가이드 | `.../외부참조문서/메두사/메두사_www_apps_book_app_learn_fundamentals_module-links_query_page.mdx` | 8.1 |
| 메두사 Return 실제 entity 코드 | `apps/backend/node_modules/.pnpm/@medusajs+order@2.15.3.../node_modules/@medusajs/order/dist/models/return.js` | 3.1 |
| 메두사 OrderClaim 실제 entity 코드 | `.../node_modules/@medusajs/order/dist/models/claim.js` | 3.1 |
| 메두사 OrderExchange 실제 entity 코드 | `.../node_modules/@medusajs/order/dist/models/exchange.js` | 3.1 |
| 메두사 ReturnStatus / ClaimType enum | `apps/backend/node_modules/.pnpm/@medusajs+utils@2.15.3.../node_modules/@medusajs/utils/dist/order/status.js` | 3.1 |
| 「전자상거래 등에서의 소비자보호에 관한 법률」 §17 (청약철회) | 국가법령정보센터 | 6.1 / 6.2 / 6.3 |
| 「전자상거래 등에서의 소비자보호에 관한 법률」 §18 (환불 timing) | 국가법령정보센터 | 6.4 |

---

> 이상 본 설계서는 Phase 3 의 `new-fe` · `new-bo` · `new-pl` sub-agent 가 코드 구현 task 의 입력으로 사용합니다. 구현 중 메두사 v2 API 변경 사항 (예: link API 시그니처 변경) 확인 시 본 문서 §5.5 갱신 필요합니다.
