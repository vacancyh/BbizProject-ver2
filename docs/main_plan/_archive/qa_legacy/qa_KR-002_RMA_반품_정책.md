# QA-KR-002 = RMA 확장 (Reimbursement / Inspection / ReturnsPolicy)

**출처**: `main_plan/이식설계/스프리_RMA_이식.md` §5.2 (`rma-extension` 모듈)
**한국 모듈 연동**: `rma-extension` (다국가 공통) + `legal-kr/withdrawal-7day` (한국 한정)
**우선순위**: P1 (필수)

---

## 사전 조건

- `rma-extension` 모듈 활성화
- 시드 데이터:
  - `ReimbursementType` 4종: `refund` / `store_credit` / `exchange` / `replacement`
  - `ReturnsPolicy` 기본 = "한국 표준 7일 정책" (`withdrawal_period_days = 7`, `return_window_days = 30`, `exchange_window_days = 30`, `claim_window_days = 90`, `resellable_default = true`)
- 배송 완료된 주문 1건

---

## 시나리오 단계

### 1. ReturnsPolicy 적용

- Store 단위 정책 = `ReturnsPolicy` row 1개 link
- `defineLink` 인용 (스프리_RMA_이식.md §5.5): `store ↔ ReturnsPolicy (1:1)`
- 신규 주문 / 반품 시 정책 자동 조회

### 2. ReimbursementType 명시 선택

- Return 생성 (qa_016) 시 새 필드 = `ReimbursementType` 추가:
  - `refund` (환불) - default
  - `store_credit` (적립금)
  - `exchange` (교환) - 사용 시 qa_018 의 Exchange workflow 와 연결
  - `replacement` (대체 발송) - claim 의 outbound 와 연결
- `defineLink`: `OrderReturn ↔ ReimbursementType (1:1)`

### 3. ReturnInspection 자동 생성

- Return Receive (qa_016) 시 `return.received` event 발행
- `rma-extension/subscribers/on-return-received.ts` -> `ReturnInspection` row 자동 생성 (관리자 검수 대기)
- `defineLink`: `OrderReturnItem ↔ ReturnInspection (1:N)`

### 4. ReturnInspection 결정

1. Admin 의 검수 화면 (확장 admin route) 진입
2. Inspection row 별 결정:
   - **Resellable** = ON / OFF (재판매 가능 / 아울렛 / 폐기)
   - **Damage description** = 자유 텍스트
   - **Condition score** = 1-5 (예: 1=폐기, 5=최상)
3. Save -> `ReturnInspection.decided_at` 갱신

### 5. ReturnShippingFeePolicy 적용

- 한국 청약철회 사유 따라 `bearer = customer` / `merchant`
- `Return.refund_amount` 계산 시 배송비 차감 / 가산
- `OrderCreditLine` 으로 audit trail 보존

---

## PASS 기준

- 4개 link 정합 (`return-reimbursement-type` / `return-inspection` / `return-returns-policy` / `return-withdrawal-eligibility`)
- ReimbursementType 4종 선택 가능
- Inspection row 자동 생성 + Admin 결정 정합
- `resellable = true` 일 때만 stock 가산 (qa_016 의 양호 수량과 정합)
- ReturnsPolicy 정책 변경 시 신규 주문에 즉시 반영

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| ReimbursementType 미선택 | default `refund` |
| Inspection 미결정 상태에서 환불 | 차단 권장 (관리자 검수 의무) |
| `resellable = false` 인데 stock 가산 | 데이터 무결성 위반 |
| ReturnsPolicy 미존재 store | fallback default policy 사용 |
| 메두사 core `damaged_quantity` 와 inspection 의 condition_score 불일치 | 동기화 룰 명시 필요 |

---

## 한국 모듈 연동 검증

### rma-extension 데이터 모델 (스프리_RMA_이식.md §5.2 인용)

```ts
ReturnsPolicy {
  withdrawal_period_days: 7    // 한국
  return_window_days: 30
  exchange_window_days: 30
  claim_window_days: 90
  return_shipping_fee_default: 0
  resellable_default: true
}

ReimbursementType {
  code: 'refund' | 'store_credit' | 'exchange' | 'replacement'
  label_ko: string
}

ReturnInspection {
  return_item_id: FK
  resellable: boolean
  damage_description: text
  condition_score: 1-5
  decided_by: user_id
  decided_at: dateTime
}

ReturnShippingFeePolicy {
  bearer: 'customer' | 'merchant'
  amount: bigNumber
}
```

### RmaExtensionService 메서드 (스프리_RMA_이식.md §5.4.1)

| 메서드 | 검증 |
|---|---|
| `getActiveReturnsPolicy(store_id)` | 기본 정책 조회 |
| `setReimbursementType(return_id, type)` | 유형 명시 |
| `createInspection(return_item_id, data)` | 검수 row 생성 |
| `decideResellable(inspection_id, resellable, reason)` | 검수 결정 |
| `computeShippingFeeBearer(return_id)` | 청약철회 사유 + 정책 종합 판정 |

