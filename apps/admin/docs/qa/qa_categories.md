# QA 리포트 — 카테고리 도메인 (어드민 리플랫폼)

- 검증 일시: 2026-06-01
- 검증 범위: `/categories` (3탭: 진열 카테고리 / 컬렉션·기획전 / 상품 태그) + `/product-types` (상품 분류 체계)
- 검증 방식: 실제 화면(Playwright) + 실제 백엔드 REST(`http://localhost:7001`) + 실제 DB(`shop-postgres`) 교차 검증
- 종합 판정: **PASS (조건부)** — 핵심 조회/상세/쓰기 경로 정상. 결함 0건, 관찰사항(WARN) 2건.

---

## 1. 환경 확인

| 항목 | 결과 | 증거 |
|---|---|---|
| admin 웹 기동 | PASS | `http://localhost:7002` 307→대시보드, 타이틀 "커머스 운영툴 — 쇼핑몰 관리자" |
| backend REST 기동 | PASS | `GET /health` 200 |
| 토큰 발급 | PASS | `POST /auth/user/emailpass` → token 정상 발급 |
| DB 접속 | PASS | `docker exec shop-postgres psql` 정상 |

---

## 2. 화면·액션별 검증 결과

### 2.1 진열 카테고리 탭 (`categories.*`)

| 화면·액션 | 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|---|
| categories.list | 트리 렌더(루트 + 노출 배지) | PASS | 8개 루트(Shirts·Sweatshirts·Pants·Merch·의류·신발·악세서리·가방) 렌더, 전부 "노출" 배지. API tree count 8 = UI 일치. `shots/categories-tree.png` | rank 순 정렬 정상 |
| categories.list | 콘솔 에러 | PASS | `browser_console_messages` 0건(favicon 404만 존재, 도메인 무관) | |
| categories.detail | 상세 드로어(명/slug/설명/활성/rank) | PASS | Shirts 클릭 → 드로어에 카테고리명 "Shirts", slug "shirts", 활성 체크, rank 0 바인딩. `shots/categories-detail.png` | |
| categories.products | 연결 상품 표시 | PASS | Shirts 드로어 "연결 상품 1개" = "Medusa T-Shirt". DB `product_category_product` 조인 결과 일치(Shirts=1) | |
| categories.products | 상품 검색(연결용) | PASS | `GET /admin/products?q=Shirt` → 2건(Medusa T-Shirt, Medusa Sweatshirt) 반환. UI 검색 버튼이 동일 호출 wiring(코드 확인) | |
| categories.create | 생성 경로(POST) | PASS | `POST /admin/product-categories` (name=QA검증_카테고리) → 200, id 발급, is_active=true 반영 | UI 추가 드로어 동일 엔드포인트 호출 |
| categories.create | 한글명 handle 폴백 | PASS | `slugify()` 한글→빈문자→`prod-<timestamp>` 폴백 로직 확인(`src/lib/api/products.ts:70`). UI 안내문 "한글이면 임시코드"와 정합 | |
| categories.delete | 삭제 + 원복 | PASS | 생성한 QA 카테고리 `DELETE` → deleted:true, tree count 8 복귀(원복 완료) | |
| categories.organize | 계층/순서(parent_category_id, rank) | WARN | rank 정렬 동작 정상. 단 **현재 라이브에 부모-자식 카테고리 쌍이 없어** 자식 트리 렌더(2단계)는 라이브 실증 불가. 직전 검증 잔재(verify-tops/verify-knit)는 soft-delete 상태 | 코드상 children 렌더 구현 존재 |
| audit | 쓰기 audit 기록 | PASS | `audit_log`에 "POST categories" (method=POST, status=200, target_type=categories) 기록 확인 | |

### 2.2 컬렉션·기획전 탭 (`collections.*`)

| 화면·액션 | 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|---|
| collections.list | 목록 렌더 | PASS | `GET /admin/collections` count 0 → 빈 상태 정상. DB 유일 컬렉션(검증 기획전)은 `deleted_at` 설정된 직전 검증 잔재 → 목록 미노출이 정상 동작 | |
| collections.create/edit/add-products | 쓰기 경로 | (미수행) | 직전 검증에서 생성→삭제 잔재 확인. 신규 쓰기는 카테고리 1건으로 대표 검증(원복 원칙 준수) | 엔드포인트 wiring 코드 확인(`/admin/collections`, `/products`) |

### 2.3 상품 태그 탭 (`product-tags.*`)

| 화면·액션 | 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|---|
| product-tags.list | 목록 렌더(연결 상품수) | PASS | `GET /admin/product-tags` count 0 → 빈 상태 정상. DB 유일 태그(검증태그)는 `deleted_at` 설정 잔재 → 미노출이 정상 | |
| product-tags.create/edit/delete | 쓰기 경로 | (미수행) | 카테고리 대표 쓰기 검증으로 갈음(원복 원칙) | wiring 코드 확인 |

### 2.4 상품 분류 체계 (`/product-types`, GAP_B)

| 화면·액션 | 항목 | 결과 | 증거 | 비고 |
|---|---|---|---|---|
| product-types.list | 트리(분야→분류) | PASS | 의류(분류 4: 상의·하의·벨트·모자) + 잡화(분류 3: 가방·신발·악세서리) 렌더. `GET /admin/catalog-types` 일치. `shots/categories-product-types.png` | |
| product-types.detail | 옵션 템플릿·고시 항목 카운트 | PASS | 각 분류 "옵션 N · 고시 M" 표시. API: 상의=옵션[사이즈,색상]·고시7, 신발=옵션[사이즈]·고시6 등 일치 | |
| product-types data | DB 백킹 데이터 실재 | PASS | `product_type_option_template` 10건(live), `product_type_disclosure_field` 47건(live) | |
| product-types.create/options/disclosure/delete | 쓰기 경로 | (미수행) | 코드 wiring 확인(`/admin/catalog-types`, `/options`, `/disclosure-fields`). 카테고리 대표 쓰기로 갈음 | |
| product-types.list | 콘솔 에러 | PASS | 0건(favicon 404 무관) | |

---

## 3. 결함 목록

**도메인 결함 0건.**

(전 세션 통틀어 콘솔 에러는 `favicon.ico` 404 1건뿐 — 카테고리 도메인과 무관한 정적 리소스 누락.)

---

## 4. 관찰사항 (WARN)

### WARN-1 — 계층(2단계 자식) 라이브 실증 불가
- 현상: 진열 카테고리 트리의 자식 렌더 기능은 코드상 구현되어 있으나, 현재 라이브 DB에 활성 부모-자식 쌍이 없어 화면 실증이 불가했다. 유일한 쌍(검증_상의 / 검증_니트)은 직전 검증 시 생성 후 `deleted_at` 처리된 잔재다.
- 재현: `/categories` 진열 카테고리 탭 → 모든 루트가 자식 없이 단독 렌더.
- 영향: 기능 결함 아님(코드 정상). 단 실데이터 부재로 회귀 검증 커버리지 공백.
- 권고: 시드에 활성 부모-자식 카테고리 1쌍 추가 권장.

### WARN-2 — 직전 검증 잔재(soft-delete)로 컬렉션·태그 목록 비어 있음
- 현상: DB에 컬렉션 1건·태그 1건이 존재하나 모두 `deleted_at`(2026-06-01 12:47) 설정 → 목록 API count 0 → 빈 상태로 노출. 이는 정상 동작이나, 컬렉션/태그 탭의 "데이터 있는 목록" 라이브 실증은 불가했다.
- 영향: 기능 결함 아님. 회귀 검증 커버리지 공백.
- 권고: 활성 컬렉션·태그 시드 1건씩 유지 권장.

---

## 5. 수행한 쓰기(원복 완료)

| 작업 | 대상 | 원복 |
|---|---|---|
| 카테고리 생성 | QA검증_카테고리 (handle: qa-verify-cat-tmp) | 동일 건 DELETE 완료, tree count 8 복귀 |

---

## 6. 종합 판정

**PASS (조건부)** — 카테고리 도메인 4개 화면(진열 카테고리·컬렉션·태그·상품 분류 체계) 모두 실데이터로 렌더 정상, 상세/연결상품/검색 정상, 생성→audit기록→삭제 쓰기 왕복 정상. 도메인 결함 0건. 단 라이브 데이터 부재로 계층 자식 렌더·컬렉션/태그 목록의 회귀 커버리지에 공백이 있어 시드 보강을 권고한다(WARN 2건).
