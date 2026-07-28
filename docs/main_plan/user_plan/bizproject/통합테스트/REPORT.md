# BbizProject 통합테스트 리포트 (분할·다중방법)

- 실행: (시각 미기록)
- 대상: `http://localhost:9009` (API 계층, shop_test DB)
- 결과: **127/127 PASS** · 실패 0

> `run-all.mjs` 가 도메인별 suite 를 독립 실행하고 자동 생성. 재실행: README.md 참고.

## 도메인(영역)별 요약

| 영역 | PASS | FAIL |
|---|---|---|
| A. 인증·계정 | 13 | 0 |
| B. 사용자 기능 | 13 | 0 |
| C. 카탈로그·콘텐츠 | 17 | 0 |
| D. 장바구니·주문·결제 | 11 | 0 |
| E. 관리자 기능 | 11 | 0 |
| F. 연계 시나리오 | 12 | 0 |
| G. 검색조건 | 23 | 0 |
| H. 부정·경계 | 12 | 0 |
| I. 동시성·레이스 | 6 | 0 |
| J. 멱등성·권한 | 9 | 0 |

## 상세 결과

### A. 인증·계정  (13/13)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| A1 | 관리자 로그인 | POST | `/auth/user/emailpass` | 200+token | 200 | ✅ | token |
| A2 | 관리자 로그인 실패(오비번) | POST | `/auth/user/emailpass` | 401 | 401 | ✅ | status=401 |
| A3 | 고객 회원가입(register) | POST | `/auth/customer/emailpass/register` | 200+token | 200 | ✅ | itest_1785218797639@kr-itest.local |
| A4 | 고객 프로필 생성 | POST | `/store/customers` | 200/201 | 200 | ✅ | cus_01KYKNA47DV6H8CWKH9R4QQ85K |
| A5 | 중복 회원가입 차단 | POST | `/auth/customer/emailpass/register` | 4xx | 401 | ✅ | status=401 |
| A6 | 신규 고객 로그인 | POST | `/auth/customer/emailpass` | 200+token | 200 | ✅ | token |
| A7 | 고객 로그인 실패(오비번) | POST | `/auth/customer/emailpass` | 401 | 401 | ✅ | status=401 |
| A8_test | 데모 로그인(test) | POST | `/auth/customer/emailpass` | 200+token | 200 | ✅ | test@kr-demo.local |
| A8_silver | 데모 로그인(silver) | POST | `/auth/customer/emailpass` | 200+token | 200 | ✅ | silver@kr-demo.local |
| A8_gold | 데모 로그인(gold) | POST | `/auth/customer/emailpass` | 200+token | 200 | ✅ | gold@kr-demo.local |
| A8_vip | 데모 로그인(vip) | POST | `/auth/customer/emailpass` | 200+token | 200 | ✅ | vip@kr-demo.local |
| A9 | 미인증 보호라우트 차단 | GET | `/store/customers/me/points` | 401 | 401 | ✅ | status=401 |
| A10 | DB: 신규 auth identity 링크 | - | `-` | ≥1 | 200 | ✅ | linked_rows=1 |

### B. 사용자 기능  (13/13)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| B1 | 내 정보 조회 | GET | `/store/customers/me` | 200 | 200 | ✅ | gold@kr-demo.local |
| B2 | 배송지 목록 | GET | `/store/customers/me/addresses` | 200+≥1 | 200 | ✅ | n=5 |
| B3 | 배송지 추가 | POST | `/store/customers/me/addresses` | 200/201 | 200 | ✅ | status=200 |
| B4 | 적립금 조회 | GET | `/store/customers/me/points` | 200+balance>0 | 200 | ✅ | balance=5554 |
| B5 | 멤버십 등급 | GET | `/store/customers/me/membership` | 200+골드 | 200 | ✅ | tier=골드 |
| B6a | 동의 조회 | GET | `/store/customers/me/consents` | 200 | 200 | ✅ | {"marketing":false,"sms":false,"email":true} |
| B6b | 동의 변경 | POST | `/store/customers/me/consents` | 200/201 | 200 | ✅ | status=200 |
| B7 | 주문 목록 | GET | `/store/orders` | 200+≥1 | 200 | ✅ | n=5 |
| B8 | 주문 상세 | GET | `/store/orders/:id` | 200 | 200 | ✅ | 19 |
| B9a | 위시리스트 추가 | POST | `/store/customers/me/wishlist` | 200/201 | 201 | ✅ | status=201 |
| B9b | 위시리스트 조회 | GET | `/store/customers/me/wishlist` | 200 | 200 | ✅ | status=200 |
| B9c | DB: 위시리스트 행 존재 | - | `-` | ≥1 | 200 | ✅ | rows=1 |
| B9d | 위시리스트 삭제 | DELETE | `/store/customers/me/wishlist/:productId` | 200 | 200 | ✅ | status=200 |

### C. 카탈로그·콘텐츠  (17/17)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| C1 | 상품 목록 | GET | `/store/products` | 200+상품 | 200 | ✅ | n=5 |
| C2 | 상품 상세 | GET | `/store/products/:id` | 200 | 200 | ✅ | Medusa Sweatshirt |
| C3 | 상품 리뷰 목록 | GET | `/store/products/:id/reviews` | 200 | 200 | ✅ | n=4 |
| C4 | 상품 문의 목록 | GET | `/store/products/:id/inquiries` | 200 | 200 | ✅ | status=200 |
| C5 | 상품정보고시 | GET | `/store/products/:id/disclosure` | 200/404 | 200 | ✅ | status=200 |
| C6 | 상품 조회수 기록 | POST | `/store/products/:id/view` | 202 | 202 | ✅ | status=202 |
| C6b | DB: 조회수 누적 기록 | - | `-` | ≥1 | 200 | ✅ | count=5 |
| C7 | 쿠폰 | GET | `/store/coupons` | 200 | 200 | ✅ | n=4 |
| C8 | 타임세일 | GET | `/store/time-sales` | 200 | 200 | ✅ | n=2 |
| C9 | 배너(hero) | GET | `/store/banners` | 200 | 200 | ✅ | n=7 |
| C10 | 공지 | GET | `/store/notices` | 200 | 200 | ✅ | n=3 |
| C11 | FAQ | GET | `/store/faqs` | 200 | 200 | ✅ | n=6 |
| C12 | 홈 큐레이션 | GET | `/store/curated-products` | 200 | 200 | ✅ | n=6 |
| C13 | 베스트 상품 | GET | `/store/best-products` | 200 | 200 | ✅ | n=18 |
| C14 | 인기 검색어 | GET | `/store/popular-search-terms` | 200 | 200 | ✅ | n=0 |
| C15 | 약관(terms-of-use) | GET | `/store/legal-docs/:slug` | 200+body | 200 | ✅ | status=200 |
| C16 | 약관(privacy-policy) | GET | `/store/legal-docs/:slug` | 200+body | 200 | ✅ | status=200 |

### D. 장바구니·주문·결제  (11/11)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| D0 | 리전(KRW) 확보 | GET | `/store/regions` | KRW | 200 | ✅ | reg_01KYK9TZF90B4MK57QYQV0XWW5 |
| D1 | 카트 생성 | POST | `/store/carts` | 200+cart | 200 | ✅ | cart_01KYKNA69RSHPCSS8TYG1FBJQV |
| D2 | 카트 배송지 | POST | `/store/carts/:id` | 200 | 200 | ✅ | status=200 |
| D3a | 배송옵션 조회 | GET | `/store/shipping-options` | 200+옵션 | 200 | ✅ | n=1 |
| D3b | 배송방법 설정 | POST | `/store/carts/:id/shipping-methods` | 200 | 200 | ✅ | status=200 |
| D4 | 쿠폰(WELCOME10) 적용 | POST | `/store/carts/:id/promotions` | 200+할인 | 200 | ✅ | discount=1650 |
| D5 | 적립금 적용 | POST | `/store/carts/:id/points` | 200/400 | 200 | ✅ | status=200 |
| D6a | 결제 컬렉션 | POST | `/store/payment-collections` | 200 | 200 | ✅ | pay_col_01KYKNA7HA59YVRXHPMFS3VW7D |
| D6b | 결제 세션 | POST | `/store/payment-collections/:id/payment-sessions` | 200 | 200 | ✅ | status=200 |
| D7 | 주문 완료(checkout) | POST | `/store/carts/:id/complete` | 200+order | 200 | ✅ | order_01KYKNA7PZXPHT23XX339PGHP6 |
| D7b | DB: 주문 레코드 존재 | - | `-` | =1 | 200 | ✅ | rows=1 |

### E. 관리자 기능  (11/11)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| E1 | 상품 목록 | GET | `/admin/products` | 200 | 200 | ✅ | n=5 |
| E2 | 주문 목록 | GET | `/admin/orders` | 200 | 200 | ✅ | n=5 |
| E3 | 회원 목록 | GET | `/admin/customers` | 200 | 200 | ✅ | n=5 |
| E4 | 리뷰 목록 | GET | `/admin/reviews` | 200 | 200 | ✅ | n=10 |
| E5 | 프로모션 목록 | GET | `/admin/promotions` | 200 | 200 | ✅ | n=5 |
| E6a | 배너 목록 | GET | `/admin/banners` | 200 | 200 | ✅ | status=200 |
| E6b | 배너 생성 | POST | `/admin/banners` | 200/201 | 201 | ✅ | status=201 |
| E7 | 대시보드 통계 | GET | `/admin/dashboard/stats` | 200 | 200 | ✅ | status=200 |
| E8 | 휴면회원 조회 | GET | `/admin/customers/dormancy` | 200 | 200 | ✅ | status=200 |
| E9 | 권한차단(고객→admin) | GET | `/admin/products` | 401/403 | 401 | ✅ | status=401 |
| E10 | 미인증 admin 차단 | GET | `/admin/orders` | 401 | 401 | ✅ | status=401 |

### F. 연계 시나리오  (12/12)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| F1a | 리뷰 작성(pending) | POST | `/store/products/:id/reviews` | 200/201 | 201 | ✅ | status=201 |
| F1b | 관리자 큐 노출 | GET | `/admin/reviews` | pending 노출 | 200 | ✅ | rev_01KYKNA8F2ZGKZCYDWD6G68X9Y |
| F1c | 관리자 리뷰 승인 | POST | `/admin/reviews/:id` | 200 | 200 | ✅ | status=200 |
| F1d | 승인 리뷰 스토어 노출 | GET | `/store/products/:id/reviews` | published 노출 | 200 | ✅ | 노출 |
| F2 | 주문→관리자검색 노출 | GET | `/admin/orders-kr/search` | ≥1 | 200 | ✅ | n=6 |
| F3 | 쿠폰 admin→store 노출 | GET | `/store/coupons` | WELCOME10 | 200 | ✅ | ["KRW5000","WELCOME10","POINTS-H8HBQZ6NZD4C","POINTS-5E826GV |
| F4 | 관리자 적립→고객 잔액 | POST | `/admin/points/customers/:id/earn` | +500 | 200 | ✅ | 3300→3800 |
| F4b | DB: 원장 합계=잔액 | - | `-` | 일치 | 200 | ✅ | db_sum=3800 api=3800 |
| F5a | 상품 문의 작성 | POST | `/store/products/:id/inquiries` | 200/201 | 201 | ✅ | status=201 |
| F5b | 관리자 문의 답변 | POST | `/admin/reviews/:id` | 200 | 200 | ✅ | status=200 |
| F6a | 비회원 주문조회(정상) | POST | `/store/orders/lookup` | 200 | 200 | ✅ | display_id=19 |
| F6b | 비회원 주문조회(불일치) | POST | `/store/orders/lookup` | 404 | 404 | ✅ | status=404 |

### G. 검색조건  (23/23)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| G1a | 상품검색·전체 | GET | `/store/products` | 200 | 200 | ✅ | n=5 |
| G1b | 상품검색·키워드(q) | GET | `/store/products` | 200 | 200 | ✅ | n=1 |
| G1c | 상품검색·키워드 무매칭 | GET | `/store/products` | 200 | 200 | ✅ | n=0 |
| G1d | 상품검색·페이지네이션(offset) | GET | `/store/products` | 200 | 200 | ✅ | n=2 |
| G1e | 상품검색·정렬(created_at) | GET | `/store/products` | 200 | 200 | ✅ | n=3 |
| G1f | 상품검색·정렬(-created_at) | GET | `/store/products` | 200 | 200 | ✅ | n=3 |
| G1g | 상품검색·핸들 필터 | GET | `/store/products` | 200 | 200 | ✅ | n=1 |
| G1h | 상품검색·카테고리 | GET | `/store/products?category_id[]` | 200 | 200 | ✅ | n=1 |
| G2a | 주문검색·전체 | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=5 |
| G2b | 주문검색·키워드(email) | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=5 |
| G2c | 주문검색·결제상태(captured) | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=0 |
| G2d | 주문검색·결제상태(authorized) | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=5 |
| G2e | 주문검색·배송상태(not_fulfilled) | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=5 |
| G2f | 주문검색·페이지네이션 | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=2 |
| G3a | 회원검색·전체 | GET | `/admin/customers` | 200 | 200 | ✅ | n=5 |
| G3b | 회원검색·이메일 부분일치 | GET | `/admin/customers` | 200 | 200 | ✅ | n=10 |
| G3c | 회원검색·한글 이름 | GET | `/admin/customers` | 200 | 200 | ✅ | n=4 |
| G3d | 회원검색·무매칭 | GET | `/admin/customers` | 200 | 200 | ✅ | n=0 |
| G3e | 회원검색·페이지네이션 | GET | `/admin/customers` | 200 | 200 | ✅ | n=3 |
| G4a | 리뷰검색·리뷰 전체 | GET | `/admin/reviews` | 200 | 200 | ✅ | n=10 |
| G4b | 리뷰검색·리뷰 pending | GET | `/admin/reviews` | 200 | 200 | ✅ | n=4 |
| G4c | 리뷰검색·리뷰 published | GET | `/admin/reviews` | 200 | 200 | ✅ | n=10 |
| G4d | 리뷰검색·문의(inquiry) | GET | `/admin/reviews` | 200 | 200 | ✅ | n=10 |

### H. 부정·경계  (12/12)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| H1 | 빈 비밀번호 가입 거부 | POST | `/auth/customer/emailpass/register` | 4xx | 400 | ✅ | status=400 |
| H2 | 잘못된 이메일 로그인 거부 | POST | `/auth/customer/emailpass` | 4xx | 401 | ✅ | status=401 |
| H3 | 미존재 사용자 로그인 거부 | POST | `/auth/customer/emailpass` | 401 | 401 | ✅ | status=401 |
| H4 | 리뷰 별점 범위초과 안전처리 | POST | `/store/products/:id/reviews` | 4xx 또는 1~5 정제 | 201 | ✅ | status=201, 범위밖행=0 |
| H5 | 리뷰 본문 누락 거부 | POST | `/store/products/:id/reviews` | 4xx | 400 | ✅ | status=400 |
| H6 | 문의 본문 최소길이 검증 | POST | `/store/products/:id/inquiries` | 4xx | 400 | ✅ | status=400 |
| H7 | 주문조회 미존재 → 404 | POST | `/store/orders/lookup` | 404 | 404 | ✅ | status=404 |
| H8 | 위조 토큰 거부 | GET | `/store/customers/me` | 401 | 401 | ✅ | status=401 |
| H9 | 재입고알림 필수값 검증 | POST | `/store/restock-notifications` | 4xx | 400 | ✅ | status=400 |
| H10 | 과대 offset 안전 처리 | GET | `/store/products` | 200+빈 | 200 | ✅ | n=0 |
| H11 | 잘못된 variant 카트 거부 | POST | `/store/carts` | 非2xx | 400 | ✅ | status=400 |
| H12 | 미인증 admin 쓰기 거부 | POST | `/admin/banners` | 401 | 401 | ✅ | status=401 |

### I. 동시성·레이스  (6/6)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| I1 | 중복가입 레이스: 1건만 성공 | - | `-` | =1 | 200 | ✅ | success=1/5 |
| I2 | 위시리스트 동시찜 → 중복 없음 | - | `-` | ≤1 | 200 | ✅ | db_rows=0 |
| I3 | 동시 조회 10건 정합성 | - | `-` | 모두 200 | 200 | ✅ | 200=10/10 |
| I4 | 동시 적립 lost-update 없음 | - | `-` | +500 일치 | 200 | ✅ | 5000→5500 (db=5500) |
| I5 | 재고 1개 동시주문 3건 → 오버셀 없음 | - | `-` | ≤1 | 200 | ✅ | 주문성공=1/3 (statuses=400,400,200) |
| I5b | DB: 가용재고 음수 아님 | - | `-` | ≥0 | 200 | ✅ | available=0 |

### J. 멱등성·권한  (9/9)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| J1 | 동의 반복설정 멱등 | - | `-` | 둘 다 2xx | 200 | ✅ | 200,200 |
| J2 | 위시리스트 반복추가 dedup | - | `-` | ≤1 | 200 | ✅ | db_rows=0 |
| J3 | GET 반복 결과 안정 | - | `-` | 동일 | 200 | ✅ | 10==10 |
| K__admin_products | 권한매트릭스 /admin/products | - | `-` | [401]/[401,403]/[200] | 200 | ✅ | none=401 cust=401 admin=200 |
| K__admin_orders | 권한매트릭스 /admin/orders | - | `-` | [401]/[401,403]/[200] | 200 | ✅ | none=401 cust=401 admin=200 |
| K__admin_customers | 권한매트릭스 /admin/customers | - | `-` | [401]/[401,403]/[200] | 200 | ✅ | none=401 cust=401 admin=200 |
| K__store_customers_me_points | 권한매트릭스 /store/customers/me/points | - | `-` | [401]/[200]/[401,403] | 200 | ✅ | none=401 cust=200 admin=401 |
| Z1 | 회원 탈퇴 | POST | `/store/customers/me/withdraw` | 200 | 200 | ✅ | status=200 |
| Z2 | 탈퇴 후 접근 차단 | - | `-` | 차단 | 200 | ✅ | 차단됨 |

