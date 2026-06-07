# QA-017 = Claim 생성 (파손 / 오배송)

**출처**: `메두사_www_apps_user-guide_app_orders_claims_page.mdx`
**한국 모듈 연동**: `legal-kr/withdrawal-7day` (claim 자동 승인 + 사업자 배송비 부담), `rma-extension`
**우선순위**: P1 (필수)

---

## 사전 조건

- 배송 완료된 주문 1건
- Admin 로그인

---

## 시나리오 단계 (메두사 user-guide 원문 인용)

user-guide 원문 (§Order Claims Overview): "If a customer receives faulty or incorrect items for an order, you can create a claim. A claim allows you to either replace or return an item for a customer, then issue a refund."

user-guide 경고 인용: "Changes made by a claim can't be canceled. Make sure to review the claim before confirming it."

### 1. Claim 생성

1. 주문 상세 -> Summary -> EllipsisHorizontal -> "Create Claim"
2. **Inbound items** (반품 받을 상품):
   - "Add items" -> 파손된 상품 체크 -> Save
   - Location 선택
   - Return Shipping (선택) + 배송비 편집
3. **Outbound items** (대체 발송 - 선택):
   - "Add items" -> 대체 상품 체크 -> Save
   - Outbound Shipping 선택 + 배송비 편집
4. **Send notifications** = ON
5. "Confirm Claim" -> Continue

### 2. Inbound items 수령 처리

user-guide 인용 (§Managing Returned Items in a Claim): "The items to be returned from the customer as part of the claim can be managed similarly to a return."

- qa_016 의 Receive items 와 동일 절차

### 3. Outbound items 배송

user-guide 인용 (§Fulfill Outbound Items in a Claim): "the outbound items of a claim are added into the 'Unfulfilled Items' section. To fulfill and deliver these items to the customer, refer to the Fulfillment guide."

- qa_014 와 동일 절차

### 4. Outstanding Payment 처리

user-guide 인용: outbound 가치 > inbound 가치 -> 추가 결제 / 반대면 refund

---

## PASS 기준

- `order_claim` row 생성 (irreversible)
- Inbound 의 Receive -> 양호분 stock 복구
- Outbound 의 Fulfillment -> 신규 fulfillment row 생성
- Outstanding 계산 정합 (return_total + outbound_shipping vs outbound_total)
- 고객 알림 발송

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| Delivered 안 된 주문 | user-guide 인용: "You can create an order claim after the order's items have been delivered" |
| Claim cancel 시도 | irreversible = 차단 |
| Outbound 의 variant 재고 0 | fulfillment 단계에서 차단 |
| Outstanding 의 refund 실패 | pending 상태로 잔존 |

---

## 한국 모듈 연동 검증

- `legal-kr/withdrawal-7day` = claim 사유 = `product_defect` / `wrong_delivery` -> 사업자 배송비 부담 강제
- 청약철회 기간 (인도일 + 7일) 과 별개로 claim 은 **하자 발견 후 30일 / 90일** 가능 (전자상거래법 §17 ③ + `claim_window_days` 정책)
- `rma-extension` = `ReimbursementType` = "Replacement" (대체 발송) / "Refund" (환불) 명시 선택

