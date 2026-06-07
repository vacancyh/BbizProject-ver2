# GAP_A — 배송(출고지·서비스 구역·배송 옵션)

> 분류: GAP_A (Medusa 有 · 우리 메뉴 자리 미정 → 신규 화면 설계). 연동: REST 호출/래핑(로직 복사 X).
> 우리 메뉴: **배송 관리**(`/shipping`). 관련 매트릭스: §20 locations · §21 shipping-profiles · §22 shipping-option-types · §23 service-zone.

## 1. 매핑(우리 화면 ↔ Medusa REST)

| 우리 화면(탭) | 동작 | Medusa REST |
|---|---|---|
| 출고지/창고 | 목록 | `GET /admin/stock-locations` (+`*address`, `fulfillment_sets.service_zones`) |
| 출고지/창고 | 등록 | `POST /admin/stock-locations` → `POST .../:id/fulfillment-providers {add:["manual_manual"]}` → `POST .../:id/fulfillment-sets {type:"shipping"}` |
| 출고지/창고 | 수정/삭제 | `POST /admin/stock-locations/:id` · `DELETE /admin/stock-locations/:id` |
| 배송 옵션·배송비 | 서비스 구역 추가/삭제 | `POST /admin/fulfillment-sets/:fsId/service-zones {geo_zones:[{type:"country",country_code}]}` · `DELETE .../service-zones/:szId` |
| 배송 옵션·배송비 | 배송 옵션 생성/삭제 | `POST /admin/shipping-options` (`price_type:"flat"`, `type{label,description,code}`, `prices[{currency_code,amount}]`, `rules[enabled_in_store/is_return]`) · `DELETE /admin/shipping-options/:id` |
| 배송 옵션·배송비 | 배송 프로파일 | `GET/POST /admin/shipping-profiles` (생성 시 기본 프로파일 사용) |

## 2. 핵심 계약(검증으로 확정한 제약)

1. **배송 옵션 생성 전 출고지에 공급자 활성화 필수** — 미활성 시 `not_allowed: Providers (manual_manual) are not enabled for the service location`. → 출고지 등록 플로우에서 `manual_manual` 자동 활성화.
2. **fulfillment-set 생성 응답은 확장 필드 미포함** — 생성 후 `GET stock-locations/:id?fields=fulfillment_sets.id` 재조회로 fset id 획득.
3. **service-zone 은 fulfillment-set 하위** — `/admin/fulfillment-sets/:fsId/service-zones`. 응답 키 `fulfillment_set`.
4. **배송비 통화** = store 지원통화에서 동적 선택(하드코딩 금지). 현재 시드 = eur/usd (KRW 미지원 → 설정 도메인에서 통화 추가 후속). 배송비 계산은 Medusa 코어.

## 3. 미구현(후속)

- §22 shipping-option-types 별도 CRUD(현재 옵션 생성 시 `type` 인라인 처리).
- locations.sales-channels 할당(설정·판매채널 도메인 연계), locations/profiles metadata.
- service-zone 다중 국가 area 시각 편집(현재 국가코드 쉼표 입력).
