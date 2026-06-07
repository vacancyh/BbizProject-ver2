# QA-014 = Fulfillment 생성 + 배송 처리

**출처**: `메두사_www_apps_user-guide_app_orders_fulfillments_page.mdx`
**한국 모듈 연동**: `state-machine` (Fulfillment state 전이)
**우선순위**: P1 (필수)

---

## 사전 조건

- 결제 완료된 주문 1건 (qa_015 사후 또는 storefront 결제)
- Stock location 1개 이상
- Shipping option (예: "CJ대한통운 택배") 1개 이상

---

## 시나리오 단계

### 1. Fulfillment 생성

1. 주문 상세 -> Unfulfilled Items 섹션 -> "Create Fulfillment" 또는 EllipsisHorizontal -> "Create Fulfillment"
2. **Location** = "Seoul Warehouse"
3. **Items** 수량 확인
4. **Send notifications** = ON
5. "Create" 클릭

### 2. Shipment 처리 (배송 시작)

1. Fulfillment 섹션 -> EllipsisHorizontal -> "Mark as shipped"
2. **Tracking number** = "1234567890" (CJ대한통운 송장번호)
3. **Tracking URL** = "https://www.cjlogistics.com/ko/tool/parcel/tracking?gnbInvcNo=1234567890"
4. Save

### 3. Delivery 처리 (배송 완료)

1. Fulfillment 섹션 -> EllipsisHorizontal -> "Mark as delivered"
2. Confirm

### 4. Fulfillment 취소

- 배송 전: Cancel 가능
- 배송 후: 별도 Return / Claim 프로세스 필요

---

## PASS 기준

- `fulfillment` row 생성
- `fulfillment.shipped_at` -> Mark as shipped 시 갱신
- `fulfillment.delivered_at` -> Mark as delivered 시 갱신
- Tracking link clickable
- 고객 이메일 알림 (각 단계별)

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| 재고 0 location 으로 fulfillment | 생성 차단 |
| Tracking number 미입력 + Mark as shipped | 일부 구현은 차단, 일부는 허용 |
| Cancelled 주문에 fulfillment | 차단 |
| 부분 배송 (3개 중 2개) | 별도 fulfillment row 생성 |

---

## 한국 모듈 연동 검증

- `state-machine` Fulfillment = `Created -> Shipped -> Delivered` 전이
- `delivery.delivered` 이벤트 -> `legal-kr/withdrawal-7day` subscriber 가 `WithdrawalEligibility.delivered_at + 7일` 자동 설정 (qa_KR-001 에서 상세)

