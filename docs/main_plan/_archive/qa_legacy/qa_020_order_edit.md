# QA-020 = Order Edit (라인 추가 / 삭제)

**출처**: `메두사_www_apps_user-guide_app_orders_edit_page.mdx`
**한국 모듈 연동**: `state-machine` (Modifying state)
**우선순위**: P1 (필수)

---

## 사전 조건

- 결제 완료 + 미배송 상태 주문 1건
- Admin 로그인

---

## 시나리오 단계

### 1. Order Edit 진입

1. 주문 상세 -> Summary -> EllipsisHorizontal -> "Edit Order"
2. 신규 편집 세션 시작 (`order_edit` row 생성)

### 2. 라인 편집

- **라인 추가**: "Add items" -> variant + 수량
- **라인 삭제**: line EllipsisHorizontal -> "Remove"
- **수량 변경**: 인풋 직접 편집
- **가격 편집** (옵션): PencilSquare -> 신규 가격

### 3. Edit 확정

1. "Confirm Edit" 클릭
2. **Outstanding amount** 계산:
   - 신규 라인 추가 -> 추가 결제 필요
   - 라인 삭제 -> 부분 환불 필요
3. 고객 confirm 요청 발송 또는 직접 확정

### 4. Edit Cancel

- Edit 진행 중 "Cancel Edit" -> Confirm

---

## PASS 기준

- `order` 의 lines 정합
- Outstanding = 변경 후 total - 기존 captured
- 신규 reservation 생성 / 해제 정합
- Audit history 보존 (변경 전 / 후)

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| 배송 완료 후 Edit | 차단 (Modifying state 진입 불가) |
| 재고 부족 라인 추가 | 차단 |
| Outstanding refund 실패 | pending 상태 잔존 |

---

## 한국 모듈 연동 검증

- `state-machine` Order = `Modifying` state 추가 (벤듀어형)
  - 벤듀어 인용: `ArrangingAdditionalPayment` 같은 중간 단계가 메두사 표준엔 없음 -> 한국 모듈에서 명시 state 추가

