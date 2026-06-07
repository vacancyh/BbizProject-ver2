# QA-027 = Sales Channel 관리

**출처**: `메두사_www_apps_user-guide_app_settings_sales-channels_page.mdx`
**한국 모듈 연동**: 없음
**우선순위**: P1 (필수)

---

## 사전 조건

- Admin 로그인

---

## 시나리오 단계

### 1. Sales channel 생성

1. Sidebar -> Settings -> Sales channels
2. "Create"
3. **Name** = "Storefront"
4. **Description** (옵션)
5. **Enabled** = ON
6. Save

### 2. 상품 / Stock location / API key 매핑

- 채널 상세 -> Products 섹션 -> Add
- Stock location 섹션 -> Add
- Settings -> Developer -> Publishable API keys -> 채널 매핑

### 3. Storefront 검증

- 채널의 publishable key 사용 시 해당 채널 상품만 노출

---

## PASS 기준

- `sales_channel` row 생성
- `product_sales_channel` link 정합
- `stock_location_sales_channel` link 정합
- API key 의 sales_channel scope 정합

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| 채널 disable | storefront 비노출 |
| Stock location 미연결 | 주문 시 fulfillment 실패 |
| Publishable key 미생성 | storefront 접근 불가 |

---

## 한국 모듈 연동 검증

- 없음

