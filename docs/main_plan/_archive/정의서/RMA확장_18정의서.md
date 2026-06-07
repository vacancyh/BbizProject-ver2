# RMA 확장(rma-extension) 도메인 정의서

> 이 프로젝트 커스텀 모듈 | 확인 경로: `src/modules/rma-extension/`

---

## 1. 도메인 개요

RMA(Return Merchandise Authorization, 반품 상품 승인) 확장 모듈입니다.
Medusa 코어의 Return/Claim/Exchange 를 수정하지 않고 `defineLink` 로 확장하여
한국 전자상거래 환경에 맞는 반품 처리 기능을 추가합니다.

---

## 2. 핵심 데이터 모델(엔티티)과 주요 필드

### 2.1 ReimbursementMethod (환불 방식)

Medusa `order_return` 1개와 1:1 Link.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (PK) | 고유 식별자 (prefix: `rmeth`) |
| `order_return_id` | string | Medusa Return ID (Link 연결점) |
| `type` | enum | `REFUND` / `STORE_CREDIT` / `EXCHANGE` / `REPLACEMENT` |
| `amount` | bigNumber | 최종 환불 금액 (배송비 가감 반영) |
| `status` | enum | `PENDING` / `PROCESSING` / `COMPLETED` / `FAILED` / `CANCELED` |
| `created_at` | datetime | 생성 일시 |
| `updated_at` | datetime | 수정 일시 |

#### ReimbursementType Enum

| 코드 | 설명 |
|------|------|
| `REFUND` | 원결제수단 환불 |
| `STORE_CREDIT` | 적립금 환불 |
| `EXCHANGE` | 교환 발송 |
| `REPLACEMENT` | 동일 품목 재발송 (claim type=replace) |

#### ReimbursementStatus Enum

| 코드 | 설명 |
|------|------|
| `PENDING` | 대기 중 |
| `PROCESSING` | 처리 중 |
| `COMPLETED` | 완료 |
| `FAILED` | 실패 |
| `CANCELED` | 취소됨 |

### 2.2 ReturnInspection (반품 검수)

Medusa `order_return` 1개에 1:N Link (품목별 검수 가능).

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (PK) | 고유 식별자 (prefix: `rinsp`) |
| `order_return_id` | string | Medusa Return ID (Link 연결점) |
| `resellable` | boolean | 재판매 가능 여부 (true = 재고 복원) |
| `condition` | enum | `A_GRADE` / `B_GRADE` / `C_GRADE` / `DISPOSE` |
| `inspector_id` | string \| null | 검수 담당 Admin User ID |
| `notes` | string \| null | 검수 메모 |
| `inspected_at` | datetime | 검수 일시 |
| `created_at` | datetime | 생성 일시 |
| `updated_at` | datetime | 수정 일시 |

#### ReturnCondition Enum

| 등급 | 설명 | 처리 |
|------|------|------|
| `A_GRADE` | 새 상품 수준 | 재판매 가능 (재고 복원) |
| `B_GRADE` | 경미한 손상 | 할인 재판매 |
| `C_GRADE` | 손상 있음 | 아울렛 처분 |
| `DISPOSE` | 폐기 대상 | 재고 불복원 |

### 2.3 ReturnsPolicy (반품 정책)

스토어 단위 반품 정책 설정 (Medusa `store.id` 와 Link).

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (PK) | 고유 식별자 (prefix: `rpol`) |
| `store_id` | string | Medusa Store ID (Link 연결점) |
| `name` | string | 정책명 |
| `window_days` | number | 반품 가능 기간 일수 (한국 기본: 7) |
| `restocking_fee_pct` | number | 재입고 수수료 비율 (한국 기본: 0) |
| `shipping_fee_payer` | enum | `customer` / `seller` / `split` |
| `active` | boolean | 정책 활성화 여부 |
| `created_at` | datetime | 생성 일시 |
| `updated_at` | datetime | 수정 일시 |

### 2.4 ReturnShippingFeePolicy (반품 배송비 정책)

ReturnsPolicy 에 속하는 사유별 배송비 부담 정책.

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (PK) | 고유 식별자 (prefix: `rsfee`) |
| `returns_policy_id` | string | 상위 ReturnsPolicy ID |
| `reason` | enum | `CUSTOMER_CHANGE_OF_MIND` / `PRODUCT_DEFECT` / `WRONG_DELIVERY` / `OTHER` |
| `payer` | enum | `CUSTOMER` / `SELLER` |
| `amount` | bigNumber \| null | 고정 배송비 (null = 실 배송비 사용) |

---

## 3. 엔티티 간 관계

```
Order.Return (Medusa core)
  ├── 1:1 Link ── ReimbursementMethod
  └── 1:N Link ── ReturnInspection

Store (Medusa core)
  └── 1:N Link ── ReturnsPolicy
                   └── 1:N ── ReturnShippingFeePolicy
```

Link 정의 파일: `src/links/order-return-rma.ts`

---

## 4. 주요 기능/유스케이스

1. **반품 접수**: 소비자 또는 관리자 → `ReturnsPolicy` 기준 접수 가능 여부 판단
2. **반품 배송비 계산**: `WithdrawalReason` → `ReturnShippingFeePolicy` 매핑 → 배송비 부담 주체 결정
3. **반품 검수**: 반품 상품 수령 후 `ReturnInspection` 등록
4. **환불 방식 결정**: 검수 결과에 따라 `ReimbursementMethod.type` 결정
5. **재고 복원**: `ReturnInspection.resellable = true` → InventoryLevel 재고 증가
6. **환불 실행**: `ReimbursementMethod.type = REFUND` → Payment 모듈 환불 API 호출

---

## 5. 이 도메인의 한국 법규 준수 포인트

- 반품 배송비: 전자상거래법 §17 ② 기준 `CUSTOMER_CHANGE_OF_MIND` = 소비자 부담, `PRODUCT_DEFECT` = 사업자 부담
- 재입고 수수료: `restocking_fee_pct = 0` (한국 원칙적 금지, 단 합의 시 허용)
- 환불 기간: `claimed_at + 3영업일` 이내 환불 의무 (§18 ①)
