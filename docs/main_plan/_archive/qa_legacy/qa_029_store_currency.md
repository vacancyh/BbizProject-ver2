# QA-029 = Store + Currency 관리

**출처**: `메두사_www_apps_user-guide_app_settings_store_page.mdx`
**한국 모듈 연동**: 없음
**우선순위**: P1 (필수)

---

## 사전 조건

- Admin 로그인

---

## 시나리오 단계

### 1. Store 정보 편집

1. Sidebar -> Settings -> Store
2. **Name** = "Test Jewelry Shop"
3. **Default region** = KR (qa_026)
4. **Default sales channel** = Storefront (qa_027)
5. Save

### 2. Currency 추가

1. Currencies 섹션 -> EllipsisHorizontal -> "Edit"
2. KRW 체크 -> Save (한국 기본)

### 3. Tax-inclusive setting (KRW)

1. KRW row -> EllipsisHorizontal -> "Edit tax-inclusive setting"
2. ON (한국 = 부가세 포함 가격 정책)
3. Save

### 4. Default currency 설정

- KRW 우측 -> "Set as default"

---

## PASS 기준

- `store` row 갱신
- `store_currency` link 정합
- `is_tax_inclusive` = true (KRW)
- Default region / channel / currency 모두 매핑

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| Default region 미설정 | storefront fallback 실패 |
| 멀티 currency + tax-inclusive 혼재 | 통화별 분기 처리 |

---

## 한국 모듈 연동 검증

- 없음 (한국 단일 region 정책)

