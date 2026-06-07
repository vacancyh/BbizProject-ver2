# QA-008 = 상품 Export (CSV)

**출처**: `메두사_www_apps_user-guide_app_products_export_page.mdx`
**한국 모듈 연동**: 없음
**우선순위**: P1 (필수)

---

## 사전 조건

- Admin 로그인
- 사전 import 된 상품 10건 이상

---

## 시나리오 단계

### 1. 전체 Export

1. Sidebar -> Products -> 우측 EllipsisHorizontal -> "Export"
2. 필터 미선택 -> 전 상품 export
3. 백그라운드 작업 시작
4. 완료 알림에서 CSV 다운로드 링크 클릭

### 2. 필터 Export

1. Products 리스트에서 필터 적용 (`Status = published`, `Category = 목걸이`)
2. 우측 EllipsisHorizontal -> "Export"
3. 필터 결과만 CSV 로 출력

### 3. CSV 검증

- 헤더 = import 템플릿과 일치
- 상품 row + variant row 정합
- 한글 인코딩 = UTF-8 BOM (Excel 호환)

---

## PASS 기준

- 백그라운드 작업 완료 후 CSV 다운로드 가능
- CSV row 수 = (필터 결과 상품 × variant 수) + 1 (header)
- 다운로드 링크 = 시간 제한 (예: 24h)

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| 0건 export | CSV header 만 출력 |
| 만건 이상 export | 백그라운드 작업 시간 초과 가능 |
| 한글 인코딩 Excel 호환 X | UTF-8 BOM 필요 |

---

## 한국 모듈 연동 검증

- 없음

