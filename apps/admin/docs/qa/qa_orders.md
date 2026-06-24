# 주문 관리 도메인 QA 리포트 (orders)

- 검증일: 2026-06-01
- 대상: admin 웹 `http://localhost:7002/orders` (페이지 타이틀 "커머스 운영툴 — 쇼핑몰 관리자")
- backend REST: `http://localhost:9000` / DB: `shop-postgres`(shop)
- 검증 방식: 실제 토큰 발급 → localStorage 주입 → Playwright 실화면 + 실 DB(psql) + REST 직접 확인
- 검증자 계정: smoke-admin@local.test

## 테스트 데이터 현황 (DB/REST 기준)

| 주문 | status | payment_status | fulfillment_status | total(list) | currency | 비고 |
|---|---|---|---|---|---|---|
| #6 | pending | authorized | not_fulfilled | 20 | eur | 미출고 |
| #5 | pending | authorized | not_fulfilled | 20 | eur | 미출고(메모 테스트 대상) |
| #4 | pending | authorized | shipped | 20 | eur | 송장 CJ대한통운 998877 |
| #3 | pending | partially_refunded | not_fulfilled | 15 | eur | 환불 5 적용 |
| #2 | canceled | canceled | not_fulfilled | 20 | eur | 강제취소됨 |
| #1 | pending | authorized | delivered | 20 | eur | 송장 123456789, 배송완료 |

## 검증 결과

| 행 | 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|---|
| orders.list | 목록 렌더 6건 | PASS | 6행 모두 렌더, 헤더(주문번호/주문일시/고객명/수량/결제금액/결제상태/주문상태/배송상태) | |
| orders.list | 통화 currency_code 표기 | PASS | 전 행 `€` 표기(EUR), 하드코딩 아님. formatCurrency = Intl.NumberFormat(currency_code) | KRW가 아닌 데이터값 그대로 |
| orders.list | 상태 한글 라벨 | PASS | #4 배송 중, #3 부분 환불, #2 취소/결제 취소, #1 배송 완료 — DB status와 일치 | status.ts 매핑 정상 |
| orders.list | 콘솔 에러 | PASS | 안정 로드 시 error 0건 | 초기 cold-start HMR 에러는 별도(아래 WARN) |
| orders.detail | 상세 드로어 렌더(#4) | PASS | 주문번호/상품(Medusa T-Shirt)/결제/배송/메모 섹션 렌더 | |
| orders.detail | PII 마스킹 | PASS | 연락처 `010-****-5678`, 이메일 `te****@example.com` (010-****-1234 형식 일치) | #4/#3/#1 모두 동일 확인 |
| orders.detail | 배송지/운송장 표기 | PASS | #4 운송장 `CJ대한통운 998877`, #1 `123456789`, 주소 `06000 서울 서울시 강남구 테스트로 1` | |
| orders.detail | 결제 금액 합계 | **FAIL** | #4: 상세 드로어 총결제 `€10.00`/상품합계 `€10.00` vs 목록 `€20.00` vs 실제 결제 amount=20 | 상세 total 불일치(아래 결함 D1) |
| orders.detail | 라인아이템 금액/수량 | **WARN** | #4 라인아이템 `€0.00`, 수량 공란 | items.total=0, quantity 누락(아래 결함 D2) |
| orders.create-fulfillment | 출고 상태 표시/버튼 게이팅 | PASS | #4(shipped) 출고/송장 버튼 숨김, #3(not_fulfilled) 출고 버튼 노출 | canFulfill 로직 정상 |
| orders.create-shipment | 송장 등록 결과 표시 | PASS | #4 fulfillment.shipped_at + labels.tracking_number `CJ대한통운 998877`, fulfillment_status=shipped | REST/DB 확인 |
| orders.create-refund | 부분 환불 상태 표시 | PASS | #3 결제상태 `부분 환불`, payment refunds amount=5, 환불 버튼 노출 | REST 확인 |
| orders.detail | 배송완료 게이팅(#1) | PASS | delivered 상태 → 출고/송장/배송완료 버튼 숨김, 환불 버튼만 노출 | canDeliver/canShip 정상 |
| GAP_B 내부메모 | 메모 작성(write, #5) | PASS | UI 저장 → 목록 표시 → `order_admin_note` 테이블 영속(omemo_01KT1NVSQ...), REST GET 재조회 count 반영 | 검증 후 soft-delete 원복 |
| GAP_B 강제취소 사유 | cancel 메모 기록 | PASS | `order_admin_note` 에 kind=cancel "주문 강제취소: 중복 주문으로 강제취소(테스트)" 기존 시드 확인, #2 canceled | order-ops-kr 정상 |
| audit | write 액션 감사 로그 | PASS | 메모 POST → audit_log `POST orders` `/admin/orders-kr/.../memos` status 200 기록 | 감사 통합 정상 |

## 결함 목록

### D1 (FAIL) — 주문 상세 결제 금액이 목록/실 결제액과 불일치
- 증상: 주문 #4 — 목록 `€20.00`, 실제 payment_collections.amount=`20`(authorized 20)인데 **상세 드로어는 총결제/상품합계 모두 `€10.00`** 로 표시.
- 원인: admin UI 렌더 버그 아님. **백엔드 상세 엔드포인트(`GET /admin/orders/:id`)가 `total=10, subtotal=10` 으로 반환**(목록 엔드포인트는 `total=20`). 같은 주문에 대해 list 집계와 detail 집계 금액이 다름.
- 재현:
  1. `GET /admin/orders?fields=display_id,total` → #4 total=20
  2. `GET /admin/orders/<id>?fields=total,subtotal,shipping_total` → #4 total=10, subtotal=10, shipping_total=10
  3. payment_collections.amount=20 (실제 승인액)
- 영향: 운영자가 상세에서 보는 결제금액이 실제 결제액의 절반 → 환불 기본값(미입력 시 detail.total 사용)도 잘못된 금액이 채워질 위험.
- 권장: 백엔드 주문 totals 집계 정합(Medusa order totals 계산/버전 차이) 점검. UI는 변경 불필요.

### D2 (WARN) — 상세 라인아이템 금액 0원 / 수량 공란
- 증상: 상세 상품 영역 라인아이템 금액 `€0.00`, 수량 표시 공란.
- 원인: 상세 엔드포인트 응답 `items[].total=0`, `items[].quantity` 미반환(목록은 items.quantity=1 정상 반환).
- 영향: 상세에서 품목 단가·수량 확인 불가.
- 권장: DETAIL_FIELDS 의 items.quantity/items.total 반환 점검(백엔드 직렬화 측), D1과 동일 totals 정합 문제로 추정.

### D3 (정보/경미) — 미사용 빈 테이블 `order_admin_memo`
- 메모 실제 저장 테이블은 `order_admin_note`. `order_admin_memo`(0행)는 사용되지 않는 고아 테이블로 보임.
- 영향: 기능 영향 없음. 마이그레이션 정리 후보.

### D4 (환경/경미) — dev 서버 cold-start 시 일시적 500 + Sidebar HMR 에러
- 증상: 최초 라우트 컴파일 시 `/orders`,`/products` 일시 500, 콘솔에 "Element type is invalid ... Check the render method of `Sidebar`"(Fast Refresh 유발).
- 안정 로드 후 재현 안 됨(콘솔 error 0건, curl `/orders` 200 + 정상 본문). next dev 컴파일/HMR 특성.
- 영향: 프로덕션(next start) 무관 추정. 운영 빌드에서 재검증 권장.

## 종합 판정

**부분 PASS** — 목록 렌더/통화/상태라벨, 상세 PII 마스킹, 출고/송장/환불 상태 표시, 강제취소·내부메모(GAP_B), 감사 로그까지 핵심 기능은 모두 동작. 단 **상세 결제금액이 실제 결제액의 절반으로 표시되는 백엔드 totals 정합 결함(D1, FAIL)** 과 라인아이템 금액/수량 누락(D2)이 존재. D1/D2 모두 admin UI가 아닌 백엔드 주문 totals 집계 측 문제.

- 스크린샷: `apps/admin/docs/qa/shots/orders-list.png`, `orders-detail-4-shipped.png`, `orders-detail-4-totals.png`, `orders-detail-3-refund.png`
- 검증 중 생성한 테스트 메모는 soft-delete 로 원복 완료.
