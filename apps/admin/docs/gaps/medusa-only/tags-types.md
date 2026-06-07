# [갭A 문서] 상품 태그 (product-tags)

> 상태: **DONE**(태그). FEATURE_MATRIX §24. Medusa `/admin/product-tags` 를 카테고리 도메인 신규 탭으로 이전.
> (product-types = 상품 분류 체계는 별도 GAP_B, `ours-only/product-classification.md` 참조)

## 1. 분류
- **갭유형**: GAP_A (Medusa core 有 · 우리 메뉴 자리 미정 → 신규 화면 이전)
- **도메인**: 카테고리
- **우리 메뉴 위치**: 카테고리(`/categories`) → "상품 태그" 탭

## 2. 기능 설명
상품 검색/필터·연관 노출에 쓰이는 자유 태그. 계층 없는 평면 라벨.
- 태그 목록(연결 상품 수), 인라인 추가(Enter), 인라인 수정, 삭제.

## 3. Medusa API
- `GET /admin/product-tags`(목록, `products.id`) · `POST /admin/product-tags`(`{value}`) · `POST /admin/product-tags/:id`(수정) · `DELETE /admin/product-tags/:id`(soft-delete).

## 4. 화면 설계 (구현됨)
- 태그 칩 그리드 + 상단 추가 입력. 칩 내 수정/삭제. ConfirmModal 삭제.

## 5. 구현 결과
- [x] FE: `lib/api/tags.ts`(list/create/update/delete) + `app/(admin)/categories/page.tsx` TagsTab.
- [x] 검증(실 DB): "검증태그" 생성→화면 표시, 삭제 soft-delete 확인. Playwright 콘솔 0.
- 후속: 상품 상세에서 태그 다중 연결(현재는 태그 마스터 관리만).

## 6. 가드레일
- Medusa core·DB 스키마 미수정. write 는 RBAC(menu=categories)·감사로그 미들웨어 통과.
