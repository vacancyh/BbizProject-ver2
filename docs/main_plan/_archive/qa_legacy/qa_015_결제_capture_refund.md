# QA-015 = 결제 Capture / Refund

**출처**: `메두사_www_apps_user-guide_app_orders_payments_page.mdx`
**한국 모듈 연동**: `state-machine` (Payment state 전이 + 한국 PG 인증)
**우선순위**: P1 (필수)

---

## 사전 조건

- 결제 진행된 주문 1건 (storefront 결제 완료, status = authorized)
- Payment provider 등록 (테스트용 = `Manual` 또는 stripe-test)
- Admin 로그인

---

## 시나리오 단계

### 1. Payment Capture

1. 주문 상세 -> Payments 섹션 -> "Capture" 버튼
2. 금액 확인 -> Confirm
3. `payment.captured_amount = order.total`

### 2. Payment Refund (전액)

1. Payments 섹션 -> EllipsisHorizontal -> "Refund"
2. **Refund Amount** = order.total
3. **Reason** = 사유 선택 (Settings -> Refund Reasons)
4. **Note** = 자유 메모
5. Confirm

### 3. Payment Partial Refund (부분 환불)

1. Refund Amount 를 부분 금액 입력 (예: order.total 의 50%)
2. 잔여 금액은 `outstanding` 으로 표시

### 4. Outstanding 처리

user-guide 인용 (returns/exchanges 와 결합): Return 으로 환불 발생 시 Summary 섹션에 outstanding amount 표시. Payments guide §refund-payment 참조하여 환불 진행.

---

## PASS 기준

- Capture 후 `payment.status = captured` / `payment.captured_amount = total`
- Refund 후 별도 `refund` row 생성 + `refunded_amount` 갱신
- 부분 환불 시 outstanding = `captured_amount - refunded_amount`
- 한국 PG (KCP/토스/카카오페이) refund API 호출 정합

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| Capture 안 된 결제에 Refund | 차단 |
| Refund Amount > captured_amount | 검증 실패 |
| 다중 refund 합 > captured | 차단 |
| PG 응답 실패 | refund status = pending / failed |

---

## 한국 모듈 연동 검증

- `state-machine` Payment = `Authorized -> Captured -> Refunded` 전이
- 한국 PG 추가 state: `PG_VERIFICATION_PENDING` (가상계좌 입금 대기) / `PG_VERIFIED` (qa_KR-003 상세)
- `Refund` 도메인: `Pending -> Settled` / `Pending -> Failed` (벤듀어 형 FSM)

