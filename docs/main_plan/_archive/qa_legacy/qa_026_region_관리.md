# QA-026 = Region 관리 (KR)

**출처**: `메두사_www_apps_user-guide_app_settings_regions_page.mdx`
**한국 모듈 연동**: `legal-kr/withdrawal-7day` (region = KR 일 때만 활성화)
**우선순위**: P1 (필수)

---

## 사전 조건

- Admin 로그인

---

## 시나리오 단계 (메두사 user-guide 원문 인용)

user-guide 원문 (§What is a Region?): "A Region represents different countries or areas that your commerce store serves customers in. A region can have multiple countries with the same settings, but a region can also be specific to a single country with its own settings. Each region has its own settings, such as currencies, payment providers, and fulfillment providers."

### 1. Region 생성 (KR)

user-guide 인용 (§Create Region):

1. Sidebar -> Settings -> Regions
2. "Create"
3. **Name** = "Korea"
4. **Currency** = KRW (region 1개 = currency 1개 룰)
5. **Automatic Taxes** = ON (default)
6. **Tax inclusive pricing** = ON (한국 = 부가세 포함 가격)
7. **Countries** -> "Add countries" -> "Korea, Republic of" 체크 -> Save
8. **Payment Providers** = Manual / KCP / 토스 / 카카오페이 (등록된 provider 선택)
9. "Save"

### 2. Region 편집

1. Region 상세 -> 첫 섹션 EllipsisHorizontal -> "Edit"
2. Name / Currency / Payment providers / Automatic Taxes / Tax-inclusive 편집
3. Save

### 3. 국가 추가 / 제거

- Countries 섹션 -> EllipsisHorizontal -> "Add countries" / Remove ('R' 키)

### 4. Region 삭제

user-guide 인용: "Deleting a region is irreversible."

- 첫 섹션 EllipsisHorizontal -> Delete -> region name 입력 confirm

---

## PASS 기준

- `region` row 생성
- `region_country` link 정합
- `payment_provider` 매핑
- Storefront 의 region 별 가격 / 결제 옵션 분기

---

## FAIL 케이스 (박제)

| 케이스 | 예상 결과 |
|---|---|
| 동일 국가를 두 region 매핑 | 차단 |
| Currency = KRW + tax-inclusive OFF | storefront 표시 불일치 |
| Payment provider 미연결 | 결제 진행 불가 |
| Region 삭제 시 active 주문 존재 | 차단 권장 |

---

## 한국 모듈 연동 검증

- `legal-kr/withdrawal-7day` = region.id 매핑된 customer 의 주문만 청약철회 룰 적용
- `state-machine` 한국 PG state (`PG_VERIFICATION_PENDING` 등) = region = KR 한정

