# QA-021 = Order Export

**출처**: `메두사_www_apps_user-guide_app_orders_export_page.mdx`
**한국 모듈 연동**: 없음
**우선순위**: P1 (필수)

---

## 사전 조건

- 주문 데이터 10건 이상 (다양 status)
- Admin 로그인

---

## 시나리오 단계

### 1. 전체 Export

1. Sidebar -> Orders -> 우측 EllipsisHorizontal -> "Export"
2. 필터 미선택 -> 전 주문 export
3. 백그라운드 작업 -> 알림에서 CSV 다운로드

### 2. 필터 Export

1. Orders 리스트 -> 필터 적용 (`Status = completed`, 날짜 범위 = 최근 30일)
2. "Export" 클릭

### 3. CSV 검증

- 헤더 = order id / date / status / customer / total / items 등
- 한국 통화 단위 정합 (KRW)
- 한글 인코딩 = UTF-8 BOM

---

## PASS 기준

- 백그라운드 작업 완료 후 CSV 링크
- Row 수 = 필터 결과 주문 수 + 1 (header)
- 한국 시간대 (KST) 정합

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| 0건 export | header 만 |
| 1만건 이상 export | 작업 시간 초과 가능 |
| Excel 한글 깨짐 | UTF-8 BOM 의무 |

---

## 한국 모듈 연동 검증

- 없음

