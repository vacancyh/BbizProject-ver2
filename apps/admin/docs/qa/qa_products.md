# 상품 관리 도메인 QA 리포트

- 대상: shop 어드민 리플랫폼 — 상품 관리(`/products`) + 상품 분류 체계(`/product-types`, GAP_B)
- 환경: admin `http://localhost:7002` · backend REST `http://localhost:7001` · DB `shop-postgres`
- 검증일: 2026-06-01
- 검증 방식: 실제 화면(Playwright) 렌더 확인 + 실제 REST 엔드포인트(UI 호출과 동일) write + 실 DB(`product`/`price`/`image`/`product_type_template`) + `audit_log` 검증. 날조 없음.
- 인증: smoke-admin@local.test 토큰 발급 후 localStorage `admin_token` 주입(actor_id=`user_01KSY583G55V3SJYNEVNZ648EZ`)

> 참고: 검증 중 동일 Playwright 브라우저를 다른 도메인 QA 에이전트가 동시 사용하여 탭 URL이 /orders·/members·/categories 등으로 수시 이동하는 환경 불안정이 있었습니다. 이는 상품 기능 결함이 아니라 공유 브라우저 경합 현상이며, 상품 페이지 렌더/상호작용 검증은 단일 원자 evaluate(폴링 내장)로 안정적으로 수행했습니다.

## 결과 요약표

| 화면·액션 | 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|---|
| products.list | 목록 렌더(11건) | PASS | products-list.png · DOM 11행 | `상품 관리 · 전체 11개` |
| products.list | 통화 표기 ₩/€ | PASS | DOM: `Medusa T-Shirt €10.00`, `UI 등록 검증 상품 ₩31,500` | currency_code 기반(하드코딩 X) |
| products.list | 카테고리 컬럼 | PASS | DOM: Shirts/Sweatshirts/Merch/Pants | categories 조인 표시 |
| products.list | 변형수(옵션) 컬럼 | PASS | DOM: 8개/1개/4개 | variants.length |
| products.list | 판매상태 배지 | PASS | DOM: 판매중/숨김 | published→판매중, draft→숨김 |
| products.list | 검색(q) | PASS | API `q=Medusa` → count 4 | |
| products.list | 상태 필터 | PASS | API `status[]=draft` → count 2 | |
| products.create | 상품 등록(기본옵션/단일변형+가격) | PASS | 생성 id `prod_01KT1NSZB7...` handle `qa-temp-verify-001` status draft, 변형가 12345 KRW. 검증 후 DELETE 원복(count 11 복귀) | UI submitCreate 와 동일 payload |
| products.detail | 상세 드로어 렌더 | PASS | products-detail-drawer 데이터: 기본정보/분류·고시/변형/이미지 섹션 | Medusa T-Shirt: 변형 8 · 이미지 4 |
| products.edit | 기본정보(부제) 인라인 편집 | PASS | subtitle `QA부제테스트` 반영 → null 원복(DB 확인) | updateProduct |
| products.media | 이미지 URL 추가 | PASS | image 행 생성(`https://example.com/qa-test-image.png`) DB 확인 | updateProduct images |
| products.media | 이미지 삭제 | PASS | images:[] → image 0행 DB 확인 | |
| products.prices | 변형 가격 편집 | PASS | 31500→32000 DB 반영 후 31500 원복(price 조인 확인) | updateVariantPrice |
| product-variants.detail | 변형 목록(제목/SKU/판매가) | PASS | DOM 8행: `S/Black · SHIRT-S-BLACK · EUR` 등 8변형 | DB 8변형과 일치 |
| GAP_B 분류·고시 | 분류 트리(분야→유형) | PASS | categories-product-types.png(분야 의류/잡화, 유형 상의·하의·벨트·모자·가방·신발·악세서리) · API `/admin/catalog-types` 2분야·7분류 | product_type_template DB 9행 |
| GAP_B 분류·고시 | 고시 템플릿 렌더 | PASS | 드로어 DOM: 고시 필수항목 7개 라벨(소재·치수·제조자/수입자·제조국·세탁방법·품질보증·A/S) · 옵션 템플릿 표시 | 상의 유형 disclosure 7필드 |
| GAP_B 분류·고시 | 분류·고시 metadata 저장 | PASS | metadata.catalog_type_id 저장 DB 확인 | updateProduct metadata |
| GAP_B 분류·고시 | 게시 전 필수항목 게이트 | PASS(코드+렌더) | 드로어: 필수항목 충족 시 `고시 필수항목 충족 — 게시 가능` 표시 / 누락 시 `게시 불가` 토스트(소스 L161-166,267-273) | 클라이언트 missingDisclosure() |
| 공통 | 콘솔 에러 | PASS | 상품 페이지 정상 렌더 시 error 0건 | HMR 재컴파일 시 transient 500은 별도 |
| 공통 | audit_log 기록 | PASS(주의) | 모든 write(POST products/variants)가 audit_log 기록(method/path/status 200/actor_id) | actor_email 컬럼 null(아래 WARN) |

## 결함 목록

### WARN-1 — audit_log.actor_email 미기록 (경미)
- 현상: 상품 write 시 `audit_log.actor_id`는 정상 기록(user_01KSY583...)되나 `actor_email` 컬럼이 항상 NULL.
- 영향: 감사 로그 가독성 저하(누가 변경했는지 이메일로 즉시 식별 불가, id→user 조인 필요). 기능 동작 자체는 정상.
- 재현: 토큰으로 `POST /admin/products/{id}` 호출 → `SELECT actor_id, actor_email FROM audit_log ORDER BY created_at DESC` → email NULL.
- 분류: 결함 아님(개선 권고). audit 미들웨어의 actor email 보강(enrichment) 누락 추정.

### INFO-1 — 공유 Playwright 브라우저 경합으로 탭 자동 이동 (환경)
- 현상: 검증 중 탭 URL이 /orders·/members·/categories 등으로 수시 이동(다른 도메인 QA 에이전트 동시 구동). shots 디렉터리에 orders/members/coupons/categories 스크린샷 공존으로 확인.
- 영향: 상품 기능 결함 아님. 클릭 기반 상호작용 불안정 → 단일 원자 evaluate(폴링)로 우회 검증함.
- 권고: 도메인별 QA는 독립 브라우저 컨텍스트/프로필로 분리 실행.

## 종합 판정

- 상품 관리 8개 검증 대상(list/create/detail/edit/media/prices/variants.detail + GAP_B 분류·고시) 전부 PASS.
- 실 화면 렌더 + 실 REST write + 실 DB + audit_log 모두 일치 확인. write 검증 후 전부 원복(상품 count 11 baseline 복귀).
- Blocker/FAIL 0건. 경미 개선 1건(WARN-1 actor_email), 환경 이슈 1건(INFO-1).

## 증거 스크린샷
- `apps/admin/docs/qa/shots/products-list.png` — 목록(₩/€·카테고리·옵션수·상태)
- `apps/admin/docs/qa/shots/products-detail-drawer.png` — 상세 드로어(전체 페이지 캡처 시점 분류체계 화면 혼입, 드로어 데이터는 원자 evaluate로 검증)
- `apps/admin/docs/qa/shots/categories-product-types.png` — 분류 체계 트리(분야/유형/고시코드/옵션·고시 수)
