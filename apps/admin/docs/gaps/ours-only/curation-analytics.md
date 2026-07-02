# [갭 문서] 상품 큐레이션·분석 (조회수·베스트·인기검색어)

> 상태: **DONE**. FEATURE_MATRIX §1-2 "베스트 상품 랭킹 / 상품 조회수 트래킹 / 인기 검색어 실집계".

## 1. 분류
- **갭유형**: GAP_B (우리 要求有 · Medusa core 無)
- **도메인**: 상품(진열·분석)
- **모듈**: `backend/services/api/src/modules/product-curation`

## 2. 기능 설명
이미 수집 중인 무비용 행동 신호(조회·위시)와 실주문 판매수량으로 상품을 진열·집계한다.
- **베스트(BEST) 랭킹**: `rankBestProducts` 순수함수. `score = sales×10 + views×1 + wishCount×5`. 판매수량은 최근 N일(기본 30) 주문 라인아이템 집계. → `GET /store/best-products?limit&days`. 홈 `베스트` 섹션(1~8위 뱃지).
- **상품 조회수 트래킹**: 상품 상세 진입 시 `POST /store/products/:id/view` → `recordView`. 스토어 `view-tracker`(세션당 1회, CSP-safe fetch).
- **인기 검색어**: 검색 시 `POST /store/popular-search-terms`(금칙어 제외 + IP당 1분 30건 rate limit) → `recordSearch`. `GET`은 count DESC + **최소 2회 임계**(1회성/오타 제외). 스토어 검색 제안이 실집계로 노출(집계 없으면 폴백).
- **금칙어**(`banned_word`): 검색/상품명/리뷰 스코프별 차단.

## 3. 필요 데이터
- `product_view_count`(product_id · count · last_viewed_at)
- `product_wishlist`(customer_id · product_id)
- `popular_search_term`(term · count · last_searched_at · is_banned)
- `banned_word`(word · scope · created_by)

## 4. Medusa API 여부
- Medusa core에 없음 → **MODULE**(custom). 판매수량만 route 에서 core order를 query.graph 로 읽어 집계(모듈은 order 직접 접근 안 함 — 가드레일). `items.quantity`는 `items.detail.quantity` 동반 요청 시 채워짐.

## 5. 구현 결과
- [x] BE: `product-curation`(models 4 + service + logic `rankBestProducts`/`filterPopularTerms`) + `src/api/store/{best-products,popular-search-terms,products/[id]/view}` + admin `product-curation/popular-terms`
- [x] FE(store): `lib/data/{best,search-terms}.ts` + `home/components/best-products` + `products/components/view-tracker` + `store/components/search-suggestions`(실집계) + 홈 배치
- [x] 검증: 베스트 판매신호 반영(판매56=score568 1위)·조회수 라이브 집계(실브라우저 7→8)·인기검색어 임계/ rate limit(30기록/5차단). 신규기능 감사 통과.
