# 통합테스트 발견사항 (FINDINGS)

- 실행: 2026-07-27, `shop_test` 임시 DB(fresh) + 백엔드 :9009
- 결과: **87 / 91 PASS**, 실패 4건 (실 엔드포인트 3개)
- 원본 표: `REPORT.md` · 기계용: `results.json`

전체 결과 요약: **인증·계정, 사용자 기능, 카탈로그·콘텐츠, 장바구니→결제 전체 흐름, 관리자 기능,
연계 시나리오(리뷰 검수·주문 노출·쿠폰·적립금·문의·비회원 조회), 검색조건(상품/주문/회원/리뷰) 모두 정상.**
실패 4건은 모두 **동일 성격의 버그** — 신규(fresh) 환경에 특정 모듈 테이블이 없어 500.

---

## 🔴 핵심 발견 — "새 환경에서 깨지는" 마이그레이션 누락 (조치 필요)

fresh DB(`db:migrate` 직후)에서 아래 3개 엔드포인트가 **500 Unknown error**. 백엔드 로그 근본원인:

| 실패 케이스 | 엔드포인트 | 로그 원인 | 누락 테이블 | 모듈 |
|---|---|---|---|---|
| B9a·B9b 위시리스트 | `GET/POST /store/customers/me/wishlist` | `relation "product_wishlist" does not exist` | `product_wishlist` | product-curation |
| C12 베스트 상품 | `GET /store/best-products` | `relation "product_view_count" does not exist` | `product_view_count` | product-curation |
| G3e 휴면회원 | `GET /admin/customers/dormancy` | `relation "customer_activity" does not exist` | `customer_activity` | customer-dormancy |

### 근본원인
- **product-curation**: 마이그레이션 파일은 있으나(`Migration20260604130000.ts`) **stale** — 이후 추가된
  `product-view-count`·`product-wishlist` 모델의 테이블을 생성하지 않는다.
- **customer-dormancy**: `migrations/` 폴더가 **비어 있음** — 마이그레이션이 아예 없어 `customer_activity` 테이블 미생성.

→ 두 모듈 모두 모델은 등록돼 있으나 스키마가 DB에 반영되지 않아, 해당 라우트가 조회 시 테이블 부재로 크래시.
현재 dev `shop` DB에서는 과거에 수동 생성돼 우연히 동작했을 뿐, **깨끗한 새 환경에서는 반드시 실패**한다.

### 권장 조치 (택1)
```bash
cd backend/services/api
# 두 모듈의 최신 모델 기준으로 마이그레이션 생성 후 반영
npx medusa db:generate productCuration customerDormancy
npx medusa db:migrate
```
- ⚠️ `customer-dormancy`는 최근 추가된 모듈이므로, 모델 확정 후 마이그레이션을 생성하는 것이 안전하다.
- 반영 후 seed-all → 통합테스트 재실행 시 B9/C12/G3e가 통과해야 한다.
- (선택) `seed-all.ts` 또는 셋업 문서에 "db:migrate 후 위 두 모듈 테이블 존재 확인" 체크를 추가하면 재발 방지.

---

## 🟢 정상 확인된 주요 연계 시나리오

- **리뷰 검수 연계 (F1)**: 고객 리뷰 작성(pending) → 관리자 큐 노출 → 승인(published) → 스토어 상품 리뷰에 노출까지 **E2E 통과**.
- **주문 연계 (F2)**: 고객 주문 → 관리자 주문검색(`/admin/orders-kr/search`)에서 email로 발견.
- **쿠폰 연계 (F3)**: 관리자 프로모션 → 스토어 `/coupons`에 `WELCOME10` 노출 → 카트 적용 시 `discount_total=1650`.
- **적립금 연계 (F4)**: 관리자 적립(`/admin/points/customers/:id/earn`) → 고객 `me/points` 잔액 +500 반영.
- **문의 연계 (F5)**: 고객 문의 작성 → 관리자 답변(`/admin/reviews/:id` reply) 정상.
- **비회원 주문조회 (F6)**: 정상 매칭 200, 이메일 불일치 시 404(안티-이뉴머레이션) 정상.
- **결제 전체 흐름 (D1~D6)**: 카트→배송지→배송옵션→쿠폰→적립금→결제세션→**주문완료** 실제 1건 생성 성공.
- **권한 (E8·E9)**: 고객 토큰으로 `/admin/*` 접근 401, 미인증 401 — RBAC/미들웨어 정상.

## 🟡 참고 / 드라이버 보정 이력

- 적립금 응답 구조는 `{ entries[], summary:{ balance, total_earned, total_used } }` — 잔액은 `summary.balance`.
  (초기 드라이버가 최상위 `balance`를 찾아 오탐 → `summary.balance`로 수정 반영.)
- `인기 검색어`는 시드 시점에 집계 데이터가 없어 `n=0`(정상, 빈 배열 200).
- `리뷰 pending`이 `n=0`인 실행은 직전 실행에서 승인 처리되어 남은 pending이 없기 때문(정상).
- 검색조건: 상품(키워드/카테고리/핸들/정렬/페이지), 주문(email/결제·배송상태/페이지), 회원(이메일부분일치/한글이름/페이지),
  리뷰·문의(type/status) 모두 200 정상. `결제상태 captured` 필터가 `n=0`인 것은 해당 상태 주문이 시드에 없어서(정상).

---

## 다음 액션 제안
1. (필수) 위 마이그레이션 누락 3테이블 조치 → 재실행으로 91/91 확인.
2. (선택) UI E2E(Playwright)로 실제 화면 단의 흐름 보강 — 현재 API 계층은 그린.
3. (선택) 결제상태 다양화 시드(captured/shipped 등)를 추가해 주문검색 상태필터 케이스를 실데이터로 강화.
