# BbizProject 통합테스트 리포트

- 실행: 2026-07-27 10:32:33    
- 대상: `http://localhost:9009` (API 계층, shop_test DB)
- 결과: **87/91 PASS** · 실패 4

> 이 리포트는 `run-integration-tests.mjs` 가 자동 생성합니다. 재실행: README.md 참고.

## 영역별 요약

| 영역 | PASS | FAIL |
|---|---|---|
| A. 인증·계정 | 12 | 0 |
| B. 사용자 기능 | 9 | 2 |
| C. 스토어 카탈로그·콘텐츠 | 14 | 1 |
| D. 장바구니·주문·결제 | 10 | 0 |
| E. 관리자 기능 | 10 | 0 |
| F. 연계 시나리오 | 11 | 0 |
| G1. 상품검색 | 6 | 0 |
| G2. 주문검색(admin) | 5 | 0 |
| G3. 회원검색(admin) | 4 | 1 |
| G4. 리뷰·문의 검색(admin) | 4 | 0 |
| Z. 회원 탈퇴(파괴적) | 2 | 0 |

## 상세 결과

### A. 인증·계정  (12/12)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| A1 | 관리자 로그인 | POST | `/auth/user/emailpass` | 200 + token | 200 | ✅ | token 발급 |
| A2 | 관리자 로그인 실패(오비번) | POST | `/auth/user/emailpass` | 401 | 401 | ✅ | status=401 |
| A3 | 고객 회원가입(register) | POST | `/auth/customer/emailpass/register` | 200 + token | 200 | ✅ | itest_1785115954009@kr-itest.local |
| A4 | 고객 프로필 생성 | POST | `/store/customers` | 200/201 + customer | 200 | ✅ | cus_01KYGK7JZYNBCRDS4DF11M7DXN |
| A5 | 중복 회원가입 차단 | POST | `/auth/customer/emailpass/register` | 4xx(이미 존재) | 401 | ✅ | status=401 |
| A6 | 신규 고객 로그인 | POST | `/auth/customer/emailpass` | 200 + token | 200 | ✅ | token |
| A7 | 고객 로그인 실패(오비번) | POST | `/auth/customer/emailpass` | 401 | 401 | ✅ | status=401 |
| A8_test | 데모 로그인(test) | POST | `/auth/customer/emailpass` | 200 + token | 200 | ✅ | test@kr-demo.local |
| A8_silver | 데모 로그인(silver) | POST | `/auth/customer/emailpass` | 200 + token | 200 | ✅ | silver@kr-demo.local |
| A8_gold | 데모 로그인(gold) | POST | `/auth/customer/emailpass` | 200 + token | 200 | ✅ | gold@kr-demo.local |
| A8_vip | 데모 로그인(vip) | POST | `/auth/customer/emailpass` | 200 + token | 200 | ✅ | vip@kr-demo.local |
| A12 | 미인증 보호라우트 차단 | GET | `/store/customers/me/points` | 401 | 401 | ✅ | status=401 |

### B. 사용자 기능  (9/11)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| B1 | 내 정보 조회 | GET | `/store/customers/me` | 200 + customer | 200 | ✅ | gold@kr-demo.local |
| B2 | 배송지 목록 | GET | `/store/customers/me/addresses` | 200 + 1건 이상 | 200 | ✅ | count=2 |
| B3 | 배송지 추가 | POST | `/store/customers/me/addresses` | 200/201 | 200 | ✅ | status=200 |
| B4 | 적립금 조회 | GET | `/store/customers/me/points` | 200 + balance>0 | 200 | ✅ | balance=6277 |
| B5 | 멤버십 등급 조회 | GET | `/store/customers/me/membership` | 200 + 골드 | 200 | ✅ | tier=골드 |
| B6a | 동의 조회 | GET | `/store/customers/me/consents` | 200 | 200 | ✅ | {"marketing":false,"sms":false,"email":true} |
| B6b | 동의 변경(marketing=off) | POST | `/store/customers/me/consents` | 200/201 | 200 | ✅ | status=200 |
| B7 | 주문 목록 | GET | `/store/orders` | 200 + 3건 | 200 | ✅ | count=4 |
| B8 | 주문 상세 | GET | `/store/orders/:id` | 200 + order | 200 | ✅ | 19 |
| B9a | 위시리스트 추가 | POST | `/store/customers/me/wishlist` | 200/201 | 500 | ❌ | status=500 |
| B9b | 위시리스트 조회 | GET | `/store/customers/me/wishlist` | 200 + 1건 | 500 | ❌ | status=500 |

### C. 스토어 카탈로그·콘텐츠  (14/15)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| C1 | 상품 목록 | GET | `/store/products` | 200 + 상품 | 200 | ✅ | count=5 |
| C2 | 상품 상세 | GET | `/store/products/:id` | 200 | 200 | ✅ | Medusa Shorts |
| C3 | 상품 리뷰 목록 | GET | `/store/products/:id/reviews` | 200 + summary | 200 | ✅ | reviews=1 |
| C4 | 상품 문의 목록 | GET | `/store/products/:id/inquiries` | 200 | 200 | ✅ | status=200 |
| C5 | 상품정보고시 | GET | `/store/products/:id/disclosure` | 200(없으면 fallback) | 200 | ✅ | status=200 |
| C6 | 쿠폰 목록 | GET | `/store/coupons` | 200 + 배열 | 200 | ✅ | n=3 |
| C7 | 타임세일 | GET | `/store/time-sales` | 200 + 배열 | 200 | ✅ | n=2 |
| C8 | 배너(hero) | GET | `/store/banners` | 200 + 배열 | 200 | ✅ | n=4 |
| C9 | 공지 | GET | `/store/notices` | 200 + 배열 | 200 | ✅ | n=3 |
| C10 | FAQ | GET | `/store/faqs` | 200 + 배열 | 200 | ✅ | n=6 |
| C11 | 홈 큐레이션 | GET | `/store/curated-products` | 200 + 배열 | 200 | ✅ | n=6 |
| C12 | 베스트 상품 | GET | `/store/best-products` | 200 + 배열 | 500 | ❌ | n=? |
| C13 | 인기 검색어 | GET | `/store/popular-search-terms` | 200 + 배열 | 200 | ✅ | n=0 |
| C14 | 약관(terms-of-use) | GET | `/store/legal-docs/:slug` | 200 + body | 200 | ✅ | status=200 |
| C15 | 약관(privacy-policy) | GET | `/store/legal-docs/:slug` | 200 + body | 200 | ✅ | status=200 |

### D. 장바구니·주문·결제  (10/10)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| D0 | 리전(KRW) 조회 | GET | `/store/regions` | 200 + KRW | 200 | ✅ | krw |
| D1 | 카트 생성 | POST | `/store/carts` | 200 + cart | 200 | ✅ | cart_01KYGK7MS3V176SR105VJCNRN1 |
| D2 | 카트 배송지 설정 | POST | `/store/carts/:id` | 200 | 200 | ✅ | status=200 |
| D3a | 배송옵션 조회 | GET | `/store/shipping-options` | 200 + 옵션 | 200 | ✅ | n=1 |
| D3b | 배송방법 설정 | POST | `/store/carts/:id/shipping-methods` | 200 | 200 | ✅ | status=200 |
| D4 | 쿠폰(WELCOME10) 적용 | POST | `/store/carts/:id/promotions` | 200 + 할인 | 200 | ✅ | discount_total=1650 |
| D5 | 적립금 적용 | POST | `/store/carts/:id/points` | 200(잔액충분시) | 200 | ✅ | status=200 |
| D6a | 결제 컬렉션 생성 | POST | `/store/payment-collections` | 200 | 200 | ✅ | pay_col_01KYGK7PKZV4AEE7PQ8CE0BMTW |
| D6b | 결제 세션 생성 | POST | `/store/payment-collections/:id/payment-sessions` | 200 | 200 | ✅ | status=200 |
| D6c | 주문 완료(checkout) | POST | `/store/carts/:id/complete` | 200 + order | 200 | ✅ | order_01KYGK7PVD40SE0VSG9FB4HEFW |

### E. 관리자 기능  (10/10)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| E1 | 관리자 상품 목록 | GET | `/admin/products` | 200 | 200 | ✅ | count=5 |
| E2 | 관리자 주문 목록 | GET | `/admin/orders` | 200 | 200 | ✅ | count=5 |
| E3 | 관리자 회원 목록 | GET | `/admin/customers` | 200 | 200 | ✅ | count=5 |
| E4 | 관리자 리뷰 큐(pending) | GET | `/admin/reviews` | 200 | 200 | ✅ | n=0 |
| E5 | 관리자 프로모션 목록 | GET | `/admin/promotions` | 200 | 200 | ✅ | count=4 |
| E6a | 관리자 배너 목록 | GET | `/admin/banners` | 200 | 200 | ✅ | status=200 |
| E6b | 관리자 배너 생성 | POST | `/admin/banners` | 200/201 | 201 | ✅ | status=201 |
| E7 | 관리자 대시보드 통계 | GET | `/admin/dashboard/stats` | 200 | 200 | ✅ | status=200 |
| E8 | 권한 차단(고객→admin) | GET | `/admin/products` | 401/403 | 401 | ✅ | status=401 |
| E9 | 미인증 admin 차단 | GET | `/admin/orders` | 401 | 401 | ✅ | status=401 |

### F. 연계 시나리오  (11/11)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| F1a | 리뷰 작성(pending) | POST | `/store/products/:id/reviews` | 200/201 | 201 | ✅ | status=201 |
| F1b | 관리자 리뷰 큐 노출 | GET | `/admin/reviews` | pending에 노출 | 200 | ✅ | rev_01KYGK7QN9WFS3BZDM1C91Y8GQ |
| F1c | 관리자 리뷰 승인 | POST | `/admin/reviews/:id` | 200 | 200 | ✅ | status=200 |
| F1d | 승인 리뷰 스토어 노출 | GET | `/store/products/:id/reviews` | published 노출 | 200 | ✅ | 노출됨 |
| F2 | 고객 주문→관리자 검색 노출 | GET | `/admin/orders-kr/search` | email로 주문 발견 | 200 | ✅ | n=5 |
| F3 | 쿠폰 admin→store 노출 | GET | `/store/coupons` | WELCOME10 노출 | 200 | ✅ | ["KRW5000","WELCOME10","POINTS-2RDT5YV3NT2X","POINTS-SR105VJ |
| F4 | 관리자 적립→고객 잔액 증가 | POST | `/admin/points/customers/:id/earn` | 1800→2300 | 200 | ✅ | 1800→2300 |
| F5a | 상품 문의 작성 | POST | `/store/products/:id/inquiries` | 200/201 | 201 | ✅ | status=201 |
| F5b | 관리자 문의 답변 | POST | `/admin/reviews/:id` | 200 | 200 | ✅ | status=200 |
| F6a | 비회원 주문조회(정상) | POST | `/store/orders/lookup` | 200 매칭 | 200 | ✅ | display_id=19 |
| F6b | 비회원 주문조회(불일치 차단) | POST | `/store/orders/lookup` | 404 | 404 | ✅ | status=404 |

### G1. 상품검색  (6/6)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| G1a | 전체 목록 | GET | `/store/products?limit=5` | 200 | 200 | ✅ | n=5 |
| G1b | 키워드(q) | GET | `/store/products?q=티셔츠&limit=5` | 200 | 200 | ✅ | n=1 |
| G1c | 페이지네이션(offset) | GET | `/store/products?limit=2&offset=2` | 200 | 200 | ✅ | n=2 |
| G1d | 정렬(order=created_at) | GET | `/store/products?order=created_at&limit=3` | 200 | 200 | ✅ | n=3 |
| G1e | 핸들 필터 | GET | `/store/products?handle=t-shirt` | 200 | 200 | ✅ | n=1 |
| G1f | 카테고리 필터 | GET | `/store/products?category_id[]` | 200 | 200 | ✅ | n=1 |

### G2. 주문검색(admin)  (5/5)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| G2a | 전체 | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=5 |
| G2b | 키워드(email) | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=5 |
| G2c | 결제상태 필터 | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=0 |
| G2d | 배송상태 필터 | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=5 |
| G2e | 페이지네이션 | GET | `/admin/orders-kr/search` | 200 | 200 | ✅ | n=2 |

### G3. 회원검색(admin)  (4/5)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| G3a | 전체 | GET | `/admin/customers` | 200 | 200 | ✅ | n=5 |
| G3b | 이메일 부분일치 | GET | `/admin/customers` | 200 | 200 | ✅ | n=10 |
| G3c | 한글 이름 검색 | GET | `/admin/customers` | 200 | 200 | ✅ | n=4 |
| G3d | 페이지네이션 | GET | `/admin/customers` | 200 | 200 | ✅ | n=3 |
| G3e | 휴면회원 조회 | GET | `/admin/customers/dormancy` | 200 | 500 | ❌ | n=0 |

### G4. 리뷰·문의 검색(admin)  (4/4)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| G4a | 리뷰 전체 | GET | `/admin/reviews` | 200 | 200 | ✅ | n=10 |
| G4b | 리뷰 pending | GET | `/admin/reviews` | 200 | 200 | ✅ | n=0 |
| G4c | 리뷰 published | GET | `/admin/reviews` | 200 | 200 | ✅ | n=10 |
| G4d | 문의(inquiry) | GET | `/admin/reviews` | 200 | 200 | ✅ | n=8 |

### Z. 회원 탈퇴(파괴적)  (2/2)

| ID | 케이스 | METHOD | PATH | 기대 | status | 결과 | 근거 |
|---|---|---|---|---|---|---|---|
| Z1 | 회원 탈퇴 | POST | `/store/customers/me/withdraw` | 200 | 200 | ✅ | status=200 |
| Z2 | 탈퇴 후 접근 차단 | GET | `/store/customers/me` | 차단 | 200 | ✅ | 차단됨 |

## 실패 케이스 (조치 필요)

- **B9a 위시리스트 추가** (POST `/store/customers/me/wishlist`) → status 500  · status=500
- **B9b 위시리스트 조회** (GET `/store/customers/me/wishlist`) → status 500  · status=500
- **C12 베스트 상품** (GET `/store/best-products`) → status 500  · n=?
- **G3e 휴면회원 조회** (GET `/admin/customers/dormancy`) → status 500  · n=0

