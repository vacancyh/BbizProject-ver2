# QA-018 = Exchange 생성 (사이즈 교환)

**출처**: `메두사_www_apps_user-guide_app_orders_exchanges_page.mdx`
**한국 모듈 연동**: `rma-extension` (Reimbursement = Exchange)
**우선순위**: P1 (필수)

---

## 사전 조건

- 배송 완료된 주문 1건 (반지 14K 사이즈 5)
- 동일 상품 사이즈 6 재고 1+
- Admin 로그인

---

## 시나리오 단계 (메두사 user-guide 원문 인용)

user-guide 원문 (§Order Exchange Overview): "After items have been delivered to the customer, you can create an exchange where the customer returns the items and you send them a new one. Order exchanges are useful if the customer received an incorrect item or they changed their mind about the item they purchased, and you want to offer them a replacement."

### 1. Exchange 생성

1. 주문 상세 -> Summary -> EllipsisHorizontal -> "Create Exchange"
2. **Inbound items** (반품 받을 상품, 사이즈 5):
   - "Add items" -> 사이즈 5 체크 -> Save
   - Location 선택 + Return Shipping (선택)
3. **Outbound items** (보낼 상품, 사이즈 6):
   - "Add items" -> 사이즈 6 체크 -> Save
   - Outbound Shipping 선택
4. **Carry over promotions** (옵션):
   - user-guide 인용: "You can only carry over fixed promotions with EACH allocation type, or percentage promotions of EACH or ACROSS allocation types. Promotions are carried over to outbound items only."
5. **Send notifications** = ON
6. "Confirm Exchange"

### 2. 반품 수령

- qa_016 의 Receive items 절차

### 3. 신규 상품 발송

- qa_014 의 Fulfillment 절차 (Unfulfilled Items 섹션)

### 4. Exchange Cancel

user-guide 인용 (§Cancel an Exchange): "You can only cancel the exchange if the outbound items haven't been fulfilled yet, and the inbound items haven't been marked as received."

1. Activity 섹션 -> Cancel next to the exchange -> Confirm

---

## PASS 기준

- `order_exchange` row 생성
- Inbound 수령 + Outbound 배송 모두 정합
- 가격 차이 계산 (사이즈 6 가격이 다를 경우 outstanding 발생)
- Promotion carry over 시 outbound 에만 적용

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| Outbound 의 variant 재고 0 | 차단 |
| Outbound fulfilled 후 Cancel 시도 | 차단 (irreversible) |
| Inbound received 후 Cancel 시도 | 차단 |
| Promotion `BY_QUANTITY` 타입 carry over | 차단 (EACH/ACROSS 만 가능) |

---

## 한국 모듈 연동 검증

- `rma-extension` = `ReimbursementType = "Exchange"` 명시
- `legal-kr/withdrawal-7day` = 사이즈 불일치 사유 = `product_defect` 하위 분류 (Phase 3 확장 후보)

