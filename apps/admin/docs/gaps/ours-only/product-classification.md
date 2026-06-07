# [갭 문서] 상품 분류 체계(상품군/유형/분류)

> 상태: **DONE**. FEATURE_MATRIX §25. 기존 `product-type` 커스텀 모듈의 관리자 UI 신설.

## 1. 분류
- **갭유형**: GAP_B (우리 確장 — Medusa native product-type 위에 옵션 템플릿 + 고시 필수항목 2단계 추가)
- **도메인**: 상품/카테고리(분류 3축 중 ② 상품유형)
- **우리 메뉴 위치**: 운영 → 상품 분류 체계(`/product-types`)

## 2. 기능 설명
"무엇을 파는가"의 분류 축(전자상거래법 상품정보제공고시 기반). Medusa 진열 카테고리와 별개.
- **분야(상품군)** → **분류(유형)** 2계층(parent_id) — 예: 의류 → 상의/하의/벨트/모자.
- 분류별 **옵션 템플릿**(사이즈 S~Free·색상 등) — 상품 등록 시 옵션 폼 자동 주입용.
- 분류별 **고시 필수항목**(제품소재·치수·제조국·세탁방법·품질보증·A/S 등) — 게시 전 필수 검증용.

## 3. 필요 데이터
- `product_type_template`(parent_id/name/disclosure_code/rank) · `product_type_option_template`(option_title/option_values[]) · `product_type_disclosure_field`(field_key/label/required/input_type). (기존 모듈, 시드 존재: 분야 2·분류 7·옵션 10·고시 47)

## 4. Medusa API 여부 + ⚠️ 경로 충돌
- 기존 모듈 `productType` 활용(재구현 0).
- ⚠️ **경로 충돌**: `/admin/product-types`는 Medusa 코어 native 엔드포인트(body `{value}` zod 검증)와 충돌 → 코어 validation이 우리 POST를 거부(`Field 'value' is required`). **회피: 우리 API = `/admin/catalog-types`**.
- **결론**: MODULE(기존) + wrap `src/api/admin/catalog-types/*`.

## 5. 화면 설계 (구현됨)
- 분야 카드 → 분류 행(펼치면 옵션 템플릿 + 고시 필수항목). 분야/분류 추가(분류는 상위 분야 선택 + 고시코드), 분류별 옵션·고시 인라인 추가, 분야/분류 삭제(ConfirmModal, 옵션·고시 cascade).

## 6. 구현 결과
- [x] BE: `src/api/admin/catalog-types/route.ts`(GET 트리 + POST 생성: parent_id/options/disclosure_fields) + `[id]`(DELETE cascade) + `[id]/options`·`[id]/disclosure-fields`(POST). 미들웨어 catalog-types→categories 매핑(RBAC/감사).
- [x] FE: `app/(admin)/product-types/page.tsx` + `lib/api/product-types.ts` + 네비 "상품 분류 체계"
- [x] 검증: typecheck/build + Playwright 트리 렌더(실 시드) + 분류 생성(옵션+고시)·옵션추가(201)·고시추가(201)·삭제(200 cascade) + 감사로그 4건 + 콘솔 0

## 7. 상품 ↔ 분류 연결 (2026-06-01)
상품 등록/상세에서 분류(상품군 › 유형) 지정 → `product.metadata`(core 미수정, native json)에 연결.
- **연결**: `metadata.catalog_type_id` = 분류 id. 상품 등록 폼 + 상세 드로어에서 선택.
- **옵션 템플릿 참조**: 분류 선택 시 해당 분류의 옵션 템플릿(사이즈/색상) 자동 표시.
- **고시 입력**: 분류의 고시 필수항목이 입력 폼으로 생성 → 값은 `metadata.disclosure.<field_key>`.
- **게시 전 검증**: 판매중(published) 전환 시 required 고시 누락이면 차단(누락 항목 toast) — 충족 시에만 게시.
- 검증(실 DB): "UI 등록 검증 상품" → catalog_type_id=상의 + disclosure 7필드 저장, 누락 시 게시 차단·충족 시 published 전환 확인. Playwright 콘솔 0.
- 후속: 옵션 템플릿 → 실제 변형 매트릭스 자동 생성, KC/원산지 별도 필드, 고시 버저닝.
