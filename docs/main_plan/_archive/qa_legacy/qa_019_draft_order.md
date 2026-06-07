# QA-019 = Draft Order 생성

**출처**: `메두사_www_apps_user-guide_app_orders_draft-orders_create_page.mdx` · `..._draft-orders_manage_page.mdx`
**한국 모듈 연동**: 없음
**우선순위**: P1 (필수)

---

## 사전 조건

- Admin 로그인
- 상품 + 재고 + customer 1명 (qa_022 사후)

---

## 시나리오 단계

### 1. Draft Order 생성

1. Sidebar -> Orders -> "Drafts" 탭 또는 Orders -> "Create" 클릭
2. **Sales channel** 선택
3. **Customer**: 기존 customer 선택 또는 신규 입력 (email 만 필수)
4. **Shipping address** / **Billing address** 입력
5. **Items**: "Add items" -> variant 체크 -> 수량 -> Save
6. **Custom item** (옵션): 라벨 + 가격 직접 입력
7. **Shipping method**: 자동 매칭된 옵션 선택
8. **Promotion code** (옵션): 적용
9. **Email**: 송장 이메일
10. "Save as draft" 또는 "Send invoice"

### 2. Draft Order 관리

- 리스트 -> Draft 상세 -> 라인 추가/삭제, 가격 편집
- Customer 이메일로 invoice 발송 -> 고객 결제 완료 시 자동으로 정식 order 전환

### 3. Draft Order 삭제

- 상세 -> EllipsisHorizontal -> "Delete"

---

## PASS 기준

- `order` row 생성 (`status = draft`)
- 결제 완료 시 `status = pending -> completed`
- Inventory reservation = draft 상태에서는 미생성 (옵션) 또는 생성 (정책 따라)

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| Customer email 없음 | 검증 실패 |
| 재고 0 + Allow backorder OFF | 라인 추가 차단 |
| Draft 의 promotion code 만료 | 자동 해제 |

---

## 한국 모듈 연동 검증

- 없음 (Draft 단계는 한국 청약철회 기산 전)

