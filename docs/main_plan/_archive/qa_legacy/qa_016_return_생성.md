# QA-016 = Return 생성 + Receive

**출처**: `메두사_www_apps_user-guide_app_orders_returns_page.mdx`
**한국 모듈 연동**: `legal-kr/withdrawal-7day` (자동 승인), `rma-extension` (Inspection)
**우선순위**: P1 (필수)

---

## 사전 조건

- 배송 완료된 주문 1건 (qa_014 = Delivered 상태)
- Settings -> Return Reasons 등록 (예: "단순변심", "상품불량", "오배송")
- Admin 로그인

---

## 시나리오 단계 (메두사 user-guide 원문 인용)

user-guide 원문 (§Order Returns Overview): "After items have been delivered to the customer, they can return the items for a refund. These items are added back to stock or marked as damaged. Medusa allows you to automate the Return Merchandise Authorization (RMA) process by supporting two ways of creating returns: 1. The customer requests a return for an order through the storefront, which you can view in the Medusa Admin dashboard; 2. Or you can create a return and inform the customer about it."

### 1. Return 생성 (Admin)

user-guide 인용 (§Create an Order Return):

1. 주문 상세 -> Summary -> EllipsisHorizontal -> "Create Return"
2. **Inbound items** = "Add items" 클릭 -> 반품 대상 체크 -> Save
3. 수량 조정 (1개 / 다중)
4. **Reason** 추가: item EllipsisHorizontal -> "Add Reason" -> "단순변심" 선택
5. **Note** 추가: item EllipsisHorizontal -> "Add Note"
6. **Location** = 반품 도착 location 선택
7. **Return shipping** = 반품 배송 옵션 선택 (선택)
   - 배송비 편집: PencilSquare 클릭 -> 신규 금액 입력
8. **Send notifications** = ON
9. "Confirm Return" -> 팝업 "Continue"

### 2. Return Receive (반품 도착 처리)

user-guide 인용 (§Mark Return Items as Received): "Once the customer returns the item, you can mark it as received. This triggers a refund to the customer and the non-damaged item quantity is added to the stock quantity in the inventory."

1. 주문 상세 -> Summary -> "Receive items" 클릭
2. 각 item 에 대해:
   - **양호 수량** 입력 (재판매 가능)
   - **손상 수량**: HeartBroken 아이콘 클릭 -> 손상 수량 입력
3. **Send notifications** = ON
4. Save

### 3. Return Cancel

user-guide 인용: "Canceling a return is irreversible. The customer would have to request a new return or you can create a return request."

- Activity 섹션 -> "Cancel next to the Return Request item" -> Confirm

---

## PASS 기준

- `order_return` row 생성 + `status = requested`
- Receive 후 `status = received` + `received_quantity` / `damaged_quantity` 정합
- 양호 수량 = `inventory_level.stocked_quantity` 가산
- 손상 수량 = stock 미가산 (별도 audit)
- Refund 자동 트리거 (Summary 에 outstanding 표시)

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| Delivered 안 된 주문에 Return | user-guide 인용: "You can create a return from the Medusa Admin for delivered items" -> 차단 |
| 재고 미존재 location 으로 반품 | user-guide 인용: "While you can choose a location that the item doesn't have inventory in, later, you can't receive the item unless you add inventory" |
| 양호 + 손상 수량 합 ≠ inbound 수량 | 검증 실패 |
| Cancel 된 return 재처리 | irreversible -> 신규 return 생성 필요 |

---

## 한국 모듈 연동 검증

- `legal-kr/withdrawal-7day` = `return.requested` event subscriber 가 `autoApproveIfEligible` 호출
  - 사유 = `customer_change_of_mind` + delivered_at + 7일 이내 -> 자동 approve
  - 사유 = `product_defect` / `wrong_delivery` -> 항상 적격
- `rma-extension` = `return.received` event 시 `ReturnInspection` row 자동 생성 (qa_KR-002 상세)
- 배송비 부담 주체: 단순변심 = 소비자 / 상품불량 / 오배송 = 사업자 (전자상거래법 §17 ②)

