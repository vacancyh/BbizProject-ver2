# QA — 배송 관리 도메인 (`/shipping`)

> 검증: 2026-06-01 · 실제 admin(:7002) + 실제 backend(:9000) + 실 DB(shop-postgres). 날조 없음.
> 검증자: main(직접) · Playwright MCP + REST + psql 교차.
> 갭유형: GAP_A(출고지·서비스구역·배송옵션 = Medusa REST 래핑) + GAP_B(국내 택배사 = store.metadata, 택배사 API mock).

## 종합 판정: **PASS** · 결함 0건 (WARN 2건)

## 화면·액션별 결과

| 탭 | 화면·액션 | 결과 | 증거 |
|---|---|---|---|
| 출고지/창고 | 목록 렌더 | PASS | European Warehouse(Copenhagen·DK·1구역) + 서울 물류센터(서울특별시 강남구 테헤란로 123·KR·1구역) 실DB 렌더 |
| 출고지/창고 | 등록(주소+공급자+배송셋 자동) | PASS | REST: stock-location 생성 → manual_manual 자동 활성화 → fulfillment-set 생성 체인 검증 |
| 출고지/창고 | 상세·인라인 수정 | PASS | getStockLocation 재조회 + updateStockLocation(명/주소) |
| 출고지/창고 | 삭제(soft) | PASS | DELETE /admin/stock-locations/:id (감사확인용 임시창고 생성→삭제) |
| 배송 옵션·배송비 | 출고지 전환 | PASS | 드롭다운 European↔서울 전환 시 구역·옵션 갱신 |
| 배송 옵션·배송비 | 서비스 구역(국가 geo_zones) | PASS | 국내(대한민국)=KR, Europe=GB/DE/DK/SE/FR/ES/IT 렌더 |
| 배송 옵션·배송비 | 배송 옵션·배송비 | PASS | 국내: 기본 택배 3 EUR · 제주·도서산간 추가 6 EUR / Europe: Standard·Express 10 USD |
| 국내 택배사(GAP_B) | 택배사 목록·기본 택배사 | PASS | CJ·우체국·한진·롯데·로젠 5종, mock 안내 노출 |
| 국내 택배사(GAP_B) | 설정 저장(store.metadata) | PASS | 기본 택배사 CJ→우체국 변경+저장 → `store.metadata.kr_delivery.default_carrier="epost"` DB 영속 확인 |
| 횡단 | audit 로그 | PASS | 재시작 후 `POST/DELETE shipping`(menu=shipping) 기록 확인 |
| 횡단 | 콘솔 에러 | PASS | 앱 에러 0 (favicon.ico 404만 — 무해) |
| 횡단 | 타입체크 | PASS | `tsc --noEmit` 통과 |

## WARN (결함 아님)

- **W1 · 배송비 통화 KRW 미지원**: store 지원통화가 eur/usd뿐이라 배송비가 €로 책정됨. 통화는 하드코딩하지 않고 store 지원통화에서 동적 선택(올바른 동작). KRW 추가는 설정 도메인(store.add-currencies) 후속.
- **W2 · 택배사 API 연동 mock**: 사장님 지시("택배사 연동 안 되어 있으니 임의 처리")대로 실제 CJ·우체국 API 연동·자동 송장 발급은 미구현. 본 탭은 기본 택배사/사용 목록 설정만 영속. 송장은 주문 관리의 수기 송장 등록으로 처리. 운송장 CSV 일괄은 후속.

## 미구현(후속, 매트릭스 반영)

- §22 shipping-option-types 별도 CRUD(현재 옵션 생성 시 type 인라인)
- service-zone 다중국가 area 시각 편집 / locations.sales-channels / metadata
- (GAP_B) 반품·교환 검수(rma-inspection) — 주문 반품 흐름 연계 후속
