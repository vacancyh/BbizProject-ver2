# QA-KR-003 = 상태머신 전이 가드 (Order / Payment / Refund / Fulfillment)

**출처**: `main_plan/이식설계/벤듀어_상태머신_이식.md` §2-6
**한국 모듈 연동**: `state-machine` 모듈 (4 도메인 FSM + 한국 PG 특화 state)
**우선순위**: P1 (필수, 거짓 진행 차단)

---

## 사전 조건

- `state-machine` 모듈 활성화 (벤듀어형 FSM 이식)
- 4 도메인 default process 등록:
  - Order: `Created / Draft / AddingItems / Cancelled / ArrangingPayment / PaymentAuthorized / PaymentSettled / PartiallyShipped / Shipped / PartiallyDelivered / Delivered / Modifying / ArrangingAdditionalPayment`
  - Payment: `Created / Authorized / Settled / Declined / Cancelled / Error` + 한국 `PG_VERIFICATION_PENDING / PG_VERIFIED`
  - Refund: `Pending / Settled / Failed` + 한국 `Requested / Approved / Processing / Completed`
  - Fulfillment: `Created / Pending / Shipped / Delivered / Cancelled`

---

## 시나리오 단계

### 1. 정상 전이 (Order)

1. 주문 생성 -> `Order.state = Created` -> `Draft` -> `AddingItems` -> `ArrangingPayment`
2. 결제 인증 완료 -> `PaymentAuthorized`
3. 결제 캡처 -> `PaymentSettled`
4. 부분 배송 -> `PartiallyShipped`
5. 전체 배송 -> `Shipped`
6. 부분 인도 -> `PartiallyDelivered`
7. 전체 인도 -> `Delivered`

### 2. 잘못된 전이 차단 (Order)

- `Cancelled -> Shipped` 시도 -> FSM 가드가 `canTransitionTo()` false 반환 -> 차단
- 벤듀어 인용 (벤듀어_state-machine_fsm.mdx §11-19): `onTransitionStart` 가 false 또는 string 반환 시 전이 차단
- 한국 비즈니스: `Delivered -> Cancelled` = 청약철회 경유 의무 (qa_KR-001)

### 3. 한국 PG 특화 state (Payment)

- 가상계좌 결제 / 카카오페이 redirect / 토스 secret_key verify 시:
  - `Created -> PG_VERIFICATION_PENDING` (입금 대기 / redirect 대기)
  - 입금 / verify 완료 -> `PG_VERIFIED -> Authorized`
- 메두사 표준엔 이 중간 단계가 없어 `pending` 단일 값으로 뭉뚱그려짐 (벤듀어_상태머신_이식.md §3.2)
- 본 시나리오에서 명시 분리 검증

### 4. 가드 함수 검증 (`assertCanTransition`)

- workflow step 안에서 `assertCanTransition(domain, currentState, targetState)` 호출
- 잘못된 전이 시 throw -> workflow rollback

### 5. checkFulfillmentStates 가드

- 벤듀어 인용 (§139-145): `checkFulfillmentStates: true` = `Shipped` 진입 시 모든 Fulfillment 가 `Shipped` 상태인지 검증
- 부분 fulfillment 만 shipped 상태 -> `Shipped` 진입 차단 -> `PartiallyShipped` 만 허용

### 6. arrangingPaymentRequiresStock 가드

- 벤듀어 인용 (§121-126): 재고 부족 시 `ArrangingPayment` 진입 차단

### 7. Refund 4단계 (한국)

- `Requested -> Approved -> Processing -> Completed` 명시 추적
- 벤듀어_상태머신_이식.md §2.4 인용: "한국 청약철회법은 단순 Settled 가 아니라 요청 → 승인 → 환불 → 완료의 4단계 추적이 필요"

---

## PASS 기준

- 모든 전이 그래프가 명시 코드화 (workflow step 분기 X)
- 잘못된 전이 = 컴파일 단계 + 런타임 모두 차단
- `FulfillmentStateTransitionEvent` 등 publish 정합
- 한국 PG state 명시 분리
- 가드 옵션 (10개 boolean) 토글 정합:
  - `arrangingPaymentRequiresStock` / `checkFulfillmentStates` 등 (벤듀어_orders_order-process.mdx §69-81 인용)

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| `Cancelled -> Shipped` 직접 전이 | FSM 가드 차단 |
| `Delivered -> Cancelled` 직접 (청약철회 미경유) | 차단 (정책 따라) |
| 메두사 표준만 사용 (state-machine 모듈 미활성) | 한국 PG 인증 단계 누락 |
| `onTransitionStart` 에러 string 반환 시 처리 | `onError` 로 전달 + 워크플로우 rollback |
| 재고 부족 + `arrangingPaymentRequiresStock = true` | 결제 진입 차단 |
| 부분 fulfillment 만 shipped + `Shipped` 시도 | 차단, `PartiallyShipped` 만 허용 |

---

## 한국 모듈 연동 검증

### FSM 코어 메서드 (벤듀어_state-machine_fsm.mdx §10-20 인용)

```ts
class FSM<T extends string, Data = any> {
  constructor(config: StateMachineConfig<T, Data>, initialState: T)
  currentState: T
  transitionTo(state: T, data: Data): Promise<{ finalize: () => Promise<any> }>
  jumpTo(state: T): void
  getNextStates(): readonly T[]
  canTransitionTo(state: T): boolean
}
```

### 4 도메인 default process (벤듀어_상태머신_이식.md §2.2-2.5)

| 도메인 | Base State | Default Process 추가 | 한국 추가 |
|---|---|---|---|
| Order | Created / Draft / AddingItems / Cancelled | ArrangingPayment / PaymentAuthorized / PaymentSettled / PartiallyShipped / Shipped / PartiallyDelivered / Delivered / Modifying / ArrangingAdditionalPayment | WITHDRAWAL_REQUESTED |
| Payment | Created / Authorized / Settled / Declined / Cancelled / Error | (벤듀어 default) | PG_VERIFICATION_PENDING / PG_VERIFIED |
| Refund | Pending / Settled / Failed | (벤듀어 default) | Requested / Approved / Processing / Completed |
| Fulfillment | Created / Pending / Cancelled | Shipped / Delivered | (한국 추가 없음, 배송사 연동은 FulfillmentHandler 가 캡슐화) |

### 가드 옵션 (벤듀어_orders_order-process.mdx §69-81 인용, DefaultOrderProcessOptions)

10개 boolean 플래그:
- `arrangingPaymentRequiresStock`
- `arrangingPaymentRequiresCustomer`
- `arrangingPaymentRequiresShipping`
- `checkFulfillmentStates`
- `arrangeAdditionalPaymentRequiresStock`
- (외 5개)

### Hook 함수 시그니처 (벤듀어_state-machine_state-machine-config.mdx §11-17)

```ts
{
  transitions: Transitions<State>
  onTransitionStart?: (fromState, toState, data) => Promise<boolean | string | void>
  onTransitionEnd?: (fromState, toState, data) => Promise<void>
  onError?: (fromState, toState, message) => void
}
```

- `onTransitionStart` 가 false / string 반환 -> 전이 차단 (string 은 `onError` 로 전달)
- `OrderTransitionData = { ctx: RequestContext; order: Order }` 모든 hook 에 주입

### 차이 (메두사 vs 벤듀어 vs 한국 모듈)

| 항목 | 메두사 표준 | 벤듀어 | 한국 모듈 (`state-machine`) |
|---|---|---|---|
| Order 중간 state | 6개 enum (pending/completed/draft/archived/canceled/requires_action) | 13개 default process + custom | 벤듀어 + 한국 PG 특화 |
| 전이 그래프 | workflow step 분기 코드 | 명시 매핑 (`Transitions<State>`) | 명시 매핑 (이식) |
| 가드 | 코드 분산 | `onTransitionStart` hook 통일 | hook + assertCanTransition wrapper |
| Fulfillment status | 타임스탬프 컬럼 추론 | `state` 컬럼 + FSM | 한국 = 벤듀어 모델 따름 |

