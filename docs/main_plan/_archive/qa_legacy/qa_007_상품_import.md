# QA-007 = 상품 Import (CSV)

**출처**: `메두사_www_apps_user-guide_app_products_import_page.mdx`
**한국 모듈 연동**: 없음
**우선순위**: P1 (필수)

---

## 사전 조건

- Admin 로그인
- 메두사 표준 import CSV 템플릿 (`Download Template` 으로 받기)
- 시드 데이터로 import 할 상품 10건 분량 CSV 준비 (목걸이 5 / 귀걸이 3 / 반지 2)

---

## 시나리오 단계

### 1. 템플릿 다운로드

1. Sidebar -> Products -> 우측 EllipsisHorizontal -> "Import" 클릭
2. "Download Template" 클릭 -> CSV 다운로드
3. 헤더 확인 (`Product Handle`, `Product Title`, `Product Status`, `Variant SKU`, `Variant Price KRW` 등)

### 2. CSV 작성 (목걸이 예)

| Product Handle | Product Title | Product Status | Variant SKU | Variant Price KRW |
|---|---|---|---|---|
| necklace-nb-002 | 18K 골드 큐빅 목걸이 NB-002 | published | NB-002-S | 450000 |
| necklace-nb-002 | 18K 골드 큐빅 목걸이 NB-002 | published | NB-002-M | 450000 |
| earring-er-001 | 14K 실버 진주 귀걸이 ER-001 | draft | ER-001-ONESIZE | 180000 |

### 3. Import 실행

1. "Choose file" -> CSV 업로드
2. Preview 확인 (변경 row 수 표시)
3. "Import" 버튼 -> 백그라운드 작업 시작
4. Activity / Notification 에서 완료 알림 확인

---

## PASS 기준

- 백그라운드 작업 status = `completed`
- 신규 상품 row 생성 수 = CSV unique handle 개수
- 신규 variant row 생성 수 = CSV row 수
- 가격 / SKU / status 정합

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| Handle 중복 (기존 상품) | upsert = 기존 상품 update |
| 필수 컬럼 누락 (`Product Title`) | 백그라운드 작업 실패 + 에러 로그 |
| CSV 인코딩 = EUC-KR | 한글 깨짐 = UTF-8 의무 |
| Variant Price KRW 음수 | 검증 실패 |

---

## 한국 모듈 연동 검증

- 없음

