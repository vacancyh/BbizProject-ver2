# QA-028 = Shipping Profile + Option Type

**출처**: `메두사_www_apps_user-guide_app_settings_locations-and-shipping_shipping-profiles_page.mdx` · `..._shipping-option-types_page.mdx`
**한국 모듈 연동**: 없음
**우선순위**: P1 (필수)

---

## 사전 조건

- Admin 로그인
- Stock location 1개 이상 (qa_011)

---

## 시나리오 단계

### 1. Shipping Profile 생성

1. Sidebar -> Settings -> Locations & Shipping -> Shipping profiles
2. "Create"
3. **Name** = "Standard"
4. **Type** = `default` / `gift_card` / `custom`
5. Save

### 2. Shipping Option Type 생성

1. Settings -> Locations & Shipping -> Shipping option types
2. "Create"
3. **Label** = "Standard delivery"
4. **Code** = "standard"
5. **Description** = "1-3 영업일"
6. Save

### 3. Stock location 의 Shipping Option 생성

1. Settings -> Locations & Shipping -> Locations -> "Seoul Warehouse"
2. Shipping options 섹션 -> "Create"
3. **Profile** = "Standard" 선택
4. **Region** = "Korea" 선택
5. **Type** = "Standard delivery"
6. **Price** = 3000 (KRW) 또는 free (조건부)
7. **Conditions**: 최소 주문 금액 등
8. Save

### 4. Return Shipping Option 생성

- 위와 동일하지만 `is_return = true` 활성화

---

## PASS 기준

- `shipping_profile` / `shipping_option_type` row 생성
- `shipping_option` row 의 profile / type / region / location 정합
- Storefront 결제 시 region + location 매칭 option 노출

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| Profile 미선택 상품 결제 | shipping option 매칭 실패 |
| Region 미매칭 | storefront 옵션 0개 |
| Return option 미생성 | qa_016 의 Return Shipping 선택 불가 |

---

## 한국 모듈 연동 검증

- 없음

