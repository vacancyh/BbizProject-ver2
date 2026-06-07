# [갭A 문서] 컬렉션 / 기획전 (collections)

> 상태: **DONE**. FEATURE_MATRIX §5. Medusa `/admin/collections` 를 카테고리 도메인 신규 탭으로 이전.

## 1. 분류
- **갭유형**: GAP_A (Medusa core 有 · 우리 메뉴 자리 미정 → 신규 화면 이전, 드롭 금지)
- **도메인**: 카테고리
- **우리 메뉴 위치**: 카테고리(`/categories`) → "컬렉션 · 기획전" 탭

## 2. 기능 설명
상품을 묶는 큐레이션 단위(기획전/시즌전). 진열 카테고리(계층/노출)와 별개로, 홈/이벤트 큐레이션에 쓰일 수평 묶음.
- 컬렉션 목록(연결 상품 수), 생성(제목→slug 자동), 상세 편집(제목/slug), 삭제.
- 컬렉션 ↔ 상품 추가/제외(검색 후 연결). 상품의 `collection_id` 로 연결(상품은 1개 컬렉션 소속).

## 3. Medusa API
- `GET /admin/collections`(목록, `products.id` 로 연결 수) · `GET /admin/collections/:id`(상세+products) · `POST /admin/collections`(생성) · `POST /admin/collections/:id`(수정) · `DELETE /admin/collections/:id`(soft-delete) · `POST /admin/collections/:id/products`(`{add,remove}`).
- 재구현 0 — REST 호출/래핑만.

## 4. 화면 설계 (구현됨)
- 카테고리 페이지 탭 분리(진열 카테고리 / 컬렉션·기획전 / 상품 태그).
- 컬렉션 탭 = DataTable(컬렉션/slug/연결 상품수) + 생성 드로어 + 상세 드로어(편집 + 소속 상품 검색 추가/제외) + 삭제 ConfirmModal.

## 5. 구현 결과
- [x] FE: `lib/api/collections.ts`(list/get/create/update/delete/updateProducts) + `app/(admin)/categories/page.tsx` CollectionsTab.
- [x] 연동: `/admin/collections*` REST. slug = 제목 slugify(한글 폴백 `prod-...` 동일 util 재사용).
- [x] 검증(실 DB): "검증 기획전" 생성(handle verify-curation-1) + 상품 추가 → `product.collection_id` DB 반영 확인, 삭제 soft-delete(`deleted_at`) 확인. Playwright 콘솔 0.
- 후속: metadata 편집, 홈 큐레이션(curation-analytics) 모듈 연계.

## 6. 가드레일
- Medusa core·DB 스키마 미수정. write 는 RBAC(menu=categories)·감사로그 미들웨어 통과(감사 200 기록 검증).
