# FEATURE_MATRIX — 어드민 리플랫폼 커버리지 권위 트래커

> 작성: 2026-06-01 (Phase 0) · 출처: `프롬프트/medusa_feature_list_v1.1.md` §2(실물 35도메인 화면·액션) + §3(양방향 갭)
> 단일 출처(SSOT). 도메인 루프(②)는 **매 세션 이 파일을 읽고** 해당 도메인의 미완료 행만 작업 → 완료 시 상태 갱신.
> 추적 단위 = **화면·액션**(도메인 단위 추적 금지 — 누락 발생).

## 범례
- **상태**: TODO(미착수) / DOING(진행) / DONE(게이트 통과)
- **갭유형**:
  - `MATCH` = Medusa 호출/래핑으로 충족 (REST `/admin/*` → wrap endpoint)
  - `GAP_A` = Medusa 有 · 우리 메뉴 자리 미정 → 신규 화면 설계까지 이전(드롭 금지)
  - `GAP_B` = 우리 要求有 · Medusa core 無 → custom module + `(메두사기능없음)` 배지
- **연동방식**: REST(1순위) / WRAP(얇은 endpoint) / MODULE(custom) / —(설계문서)
- **문서경로**: 갭 상세는 `apps/admin/docs/gaps/{medusa-only|ours-only}/`

---

## 0. 도메인(수직 슬라이스) 구현 순서

| 순서 | 우리 메뉴 | 비고 |
|---|---|---|
| 0 | **기반(횡단)** RBAC·감사로그·정책저장소 | 모든 도메인 의존 → 최우선. `backend/services/api/src/modules/{rbac,audit,policy}` |
| 1 | 주문 관리 | High |
| 2 | 상품 관리 | High |
| 3 | 카테고리 | High |
| 4 | 회원 관리 | High |
| 5 | 배송 관리 | Medium |
| 6 | 정산 관리 | Medium |
| 7 | 쿠폰·프로모션 | Medium |
| 8 | 리뷰·문의 | Medium |
| 9 | 통계·리포트 | Medium |
| 10 | 마케팅 | Medium |
| 11 | 쇼핑몰 설정 | Medium |

---

## 1. 커머스 운영 (사이드바 본 메뉴)

### 1) home / 대시보드 → 우리 메뉴: **대시보드**
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| 대시보드(위젯) | 대시보드 메인 | TODO | MATCH | WRAP | 대시보드 | — | dashboard/stats 집계 wrap |
| (보강) 정산 KPI·경보 | 대시보드 KPI 카드 | TODO | GAP_B | MODULE | 대시보드 | ours-only/dashboard-kpi.md | settlement 모듈 연동 |
| (보강) 통화 표기(currency_code) | 전 화면 공통 | DONE | GAP_B | — | 대시보드 | — | 하드코딩 금지. 국내 KRW 기본(한국 region·세금10%·배송·전 상품가 — setup-korea.ts), EUR 보존 |

### 2) products → 우리 메뉴: **상품 관리**
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| products.list | 상품 목록 | DONE | MATCH | REST | 상품 | — | /products 목록(통화 표기·변형수)·카테고리 필터(category_id)·최근수정 정렬 Playwright 검증 |
| products.create | 상품 등록 | DONE | MATCH | REST | 상품 | — | 등록 폼(기본옵션/변형+가격, handle 자동) UI end-to-end 검증(DB) |
| products.import(CSV) | 상품 일괄 등록 | TODO | MATCH | REST | 상품 | — | 후속 |
| products.export | 상품 내보내기 | TODO | MATCH | REST | 상품 | — | 후속 |
| products.detail | 상품 상세 | DONE | MATCH | REST | 상품 | — | DetailDrawer(기본정보·변형8·이미지) Playwright 검증 |
| products.edit | 상품 수정 | DONE | MATCH | REST | 상품 | — | 기본정보(명·부제·설명·handle)+상태 인라인 편집 검증 |
| products.attributes | 속성 편집 | TODO | MATCH | REST | 상품 | — | |
| products.organization(카테고리/컬렉션/태그) | 분류 편집 | TODO | MATCH | REST | 상품 | — | |
| products.shipping-profile | 배송 프로파일 연결 | TODO | MATCH | REST | 상품 | — | |
| products.media | 이미지 관리 | DONE | MATCH | REST | 상품 | — | 이미지 URL 추가·삭제(images 교체) 검증 |
| products.image-variants-edit | 이미지-변형 매핑 | TODO | MATCH | REST | 상품 | — | |
| products.prices | 가격 편집 | DONE | MATCH | REST | 상품 | — | 변형 가격 편집 UI end-to-end(₩29,900→₩31,500 DB) 검증 |
| products.create-option / edit-option | 옵션 추가·수정 | TODO | MATCH | REST | 상품 | — | |
| products.create-variant | 변형 추가 | TODO | MATCH | REST | 상품 | — | |
| products.stock | 재고 | TODO | MATCH | REST | 상품 | — | |
| products.metadata | 메타데이터 | TODO | MATCH | REST | 상품 | — | |
| products.sales-channels | 판매채널 연결 | TODO | MATCH | REST | 상품 | — | |
| (보강) 상품정보고시·KC·원산지 | 고시 템플릿/검증/버저닝 | DONE | GAP_B | MODULE | 상품 | ours-only/product-classification.md | 분류(상품유형)별 고시 템플릿 + 상품 metadata 연결 + 게시 전 고시 필수항목 검증(실 DB 검증) · KC/버저닝 후속 |
| (보강) 타임세일 | 기간·재고 제한, 종료 시 원가 복원 | TODO | GAP_B | MODULE | 상품 | ours-only/flash-sale.md | flash-sale module |
| (보강) 베스트 상품 랭킹 | 최근N일 판매수량×10+조회수+위시×5 가중 | DONE | GAP_B | MODULE | 상품 | ours-only/curation-analytics.md | product-curation `rankBestProducts` + `GET /store/best-products?limit&days` |
| (보강) 상품 조회수 트래킹 | 상품 상세 진입 시 조회수 집계 | DONE | GAP_B | MODULE | 상품 | ours-only/curation-analytics.md | `POST /store/products/:id/view` + 스토어 `view-tracker`(세션당 1회) |
| (보강) 인기 검색어 실집계 | 검색어 집계·금칙어 제외·노출 임계 | DONE | GAP_B | MODULE | 상품 | ours-only/curation-analytics.md | `GET/POST /store/popular-search-terms`(최소 2회 임계 + IP rate limit) |
| (보강) 재고 동시성 | 원자적 차감·음수방지·배치 충돌 | TODO | GAP_B | MODULE | 상품 | ours-only/inventory-concurrency.md | inventory 래핑+락 |

### 3) product-variants → **상품 관리**(하위)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| product-variants.detail | 변형 상세 | DONE | MATCH | REST | 상품 | — | 상품 상세 드로어에 변형 목록(제목/SKU/판매가) 표시 |
| product-variants.edit(SKU/바코드/가격) | 변형 수정 | TODO | MATCH | REST | 상품 | — | |
| product-variants.manage-inventory-items | 재고 항목 관리 | TODO | MATCH | REST | 상품 | — | |
| product-variants.media | 변형 이미지 | TODO | MATCH | REST | 상품 | — | |
| product-variants.metadata | 메타데이터 | TODO | MATCH | REST | 상품 | — | |

### 4) categories → 우리 메뉴: **카테고리**
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| categories.list | 카테고리 목록(트리) | DONE | MATCH | REST | 카테고리 | — | /categories 진열 카테고리 탭 — 루트+children 트리(노출 배지) Playwright 실DB 검증 |
| categories.create | 카테고리 생성 | DONE | MATCH | REST | 카테고리 | — | 추가 드로어(상위 선택·활성·내부용), 한글명 handle 폴백 검증 |
| categories.detail / edit | 카테고리 상세·수정 | DONE | MATCH | REST | 카테고리 | — | 상세 드로어(명·slug·설명·활성·rank) 인라인 편집 |
| categories.organize(계층/순서) | 계층/순서 편집 | DONE | MATCH | REST | 카테고리 | — | parent_category_id 계층(검증_상의▸검증_니트 DB 검증) + rank 정렬 |
| categories.products(추가·제거) | 상품 연결 | DONE | MATCH | REST | 카테고리 | — | 상세 내 상품 검색→연결/해제(product_category_product DB 검증) |
| categories.metadata | 메타데이터 | TODO | MATCH | REST | 카테고리 | — | 후속 |
| (보강) slug 검증·캐시 무효화 | 한국형 검증 | TODO | GAP_B | WRAP | 카테고리 | ours-only/category-slug-cache.md | slug 자동생성(한글 폴백)은 적용. 캐시 무효화 후속 |

### 5) collections → **카테고리**(컬렉션/기획전, GAP_A)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| collections.list / create / detail / edit | 컬렉션/기획전 신규화면 | DONE | GAP_A | REST | 카테고리 | medusa-only/collections.md | /categories 컬렉션 탭 — 목록·생성·상세(제목/slug)·삭제 Playwright 실DB 검증 |
| collections.add-products | 컬렉션 상품 추가 | DONE | GAP_A | REST | 카테고리 | medusa-only/collections.md | 상세 내 상품 검색→추가/제외(product.collection_id DB 검증) |
| collections.metadata | 메타데이터 | TODO | GAP_A | REST | 카테고리 | medusa-only/collections.md | 후속 |

### 6) orders → 우리 메뉴: **주문 관리**
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| orders.list | 주문 목록 | DONE | MATCH | REST | 주문 | — | /orders 목록(통화 currency_code 표기). 결제/배송상태 탭·검색·정렬(번호/일시/금액)은 커스텀 GET /admin/orders-kr/search Playwright 검증 |
| orders.export | 주문 내보내기 | TODO | MATCH | REST | 주문 | — | 엑셀 다운로드 버튼 placeholder — 후속 |
| orders.detail | 주문 상세 | DONE | MATCH | REST | 주문 | — | DetailDrawer(상품/결제/배송/PII마스킹) Playwright 검증 |
| orders.create-fulfillment | 출고 처리 | DONE | MATCH | REST | 주문 | — | /admin/orders/:id/fulfillments 실행검증(#1/#4 fulfilled) |
| orders.receive-return | 반품 수령 | TODO | MATCH | REST | 주문 | — | |
| orders.allocate-items | 재고 할당 | TODO | MATCH | REST | 주문 | — | reservations 연동 |
| orders.create-shipment(송장/배송사) | 송장 등록 | DONE | MATCH | REST | 주문 | — | 택배사+송장번호 → shipments(#4 shipped, tracking 검증) |
| orders.create-return | 반품 생성 | TODO | MATCH | REST | 주문 | — | |
| orders.create-claim | 클레임 생성 | TODO | MATCH | REST | 주문 | — | |
| orders.create-exchange | 교환 생성 | TODO | MATCH | REST | 주문 | — | |
| orders.create-edit | 주문 수정 | TODO | MATCH | REST | 주문 | — | |
| orders.create-refund | 환불 처리 | DONE | MATCH | REST | 주문 | — | payments capture→refund(#3 partially_refunded 검증) |
| orders.request-transfer | 주문 이관 요청 | TODO | MATCH | REST | 주문 | — | |
| orders.edit-email | 이메일 수정 | TODO | MATCH | REST | 주문 | — | |
| orders.edit-shipping-address | 배송지 수정 | TODO | MATCH | REST | 주문 | — | |
| orders.edit-billing-address | 청구지 수정 | TODO | MATCH | REST | 주문 | — | |
| orders.metadata | 메타데이터 | TODO | MATCH | REST | 주문 | — | |
| orders.create (draft) | 수기 주문 생성 | TODO | GAP_A | REST | 주문 | medusa-only/draft-orders.md | 전화/CS 주문 — prototype 미설계, 후속 |
| (보강) 강제취소·내부메모 | 한국형 주문 운영 | DONE | GAP_B | MODULE | 주문 | ours-only/order-ops-kr.md | order-ops-kr 모듈 — 강제취소(cancelOrderWorkflow 래핑)+내부메모 검증, 정산연동 후속 |

### 7) price-lists → **쿠폰·프로모션**(회원등급별/기간 특가, GAP_A 흡수)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| price-lists.list / create / detail / edit | 회원등급별·기간 특가 | TODO | GAP_A | REST | 쿠폰·프로모션 | medusa-only/price-lists.md | 멤버십 등급가 매핑 |
| price-lists.configuration(고객그룹/지역) | 대상 설정 | TODO | GAP_A | REST | 쿠폰·프로모션 | medusa-only/price-lists.md | |
| price-lists.prices-add / prices-edit | 가격 추가·수정 | TODO | GAP_A | REST | 쿠폰·프로모션 | medusa-only/price-lists.md | |
| price-lists.metadata | 메타데이터 | TODO | GAP_A | REST | 쿠폰·프로모션 | medusa-only/price-lists.md | |

### 8) promotions → **쿠폰·프로모션**
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| promotions.list | 프로모션 목록 | DONE | MATCH | REST | 쿠폰·프로모션 | — | /coupons 목록(코드·할인요약·적용대상·상태) Playwright 실DB 검증 |
| promotions.create | 프로모션 생성 | DONE | MATCH | REST | 쿠폰·프로모션 | — | 생성 드로어: 할인(정률/정액)+적용대상(주문/상품/카테고리/컬렉션 상품연계)+주문조건(회원그룹). items=across 기본(maxQty시 each). UI end-to-end 검증 |
| promotions.detail / edit-details / edit-rules | 상세·규칙 편집 | DONE | MATCH | REST | 쿠폰·프로모션 | — | 상세: 상품연계 target_rules·주문조건 rules 표시 + 상태(active/inactive/draft) 변경. target 사후 add/remove(batch)는 후속 |
| promotions.add-campaign | 캠페인 연결 | TODO | GAP_A | REST | 쿠폰·프로모션 | medusa-only/campaigns.md | 캠페인(GAP_A) 화면 후속 |
| (보강) 한국식쿠폰(정률/정액·최대할인·최소주문·대량발급·자동발급·강제회수·취소복원) | 쿠폰 운영 | TODO | GAP_B | MODULE | 쿠폰·프로모션 | ours-only/coupon-kr.md | promotion 래핑+coupon-ops |
| (보강) 포인트(적립/사용/소멸·유효기간·D-N 알림) | 포인트 운영 | TODO | GAP_B | MODULE | 쿠폰·프로모션 | ours-only/point.md | point module |

### 9) campaigns → **쿠폰·프로모션**(이벤트/캠페인, GAP_A)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| campaigns.list / create / detail / edit | 이벤트/캠페인 | TODO | GAP_A | REST | 쿠폰·프로모션 | medusa-only/campaigns.md | 이벤트 쿠폰과 매핑 |
| campaigns.configuration / budget-edit | 설정·예산 | TODO | GAP_A | REST | 쿠폰·프로모션 | medusa-only/campaigns.md | |
| campaigns.add-promotions | 프로모션 연결 | TODO | GAP_A | REST | 쿠폰·프로모션 | medusa-only/campaigns.md | |

### 10) customers → 우리 메뉴: **회원 관리**
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| customers.list | 회원 목록 | DONE | MATCH | REST | 회원 | — | /members 회원 탭 — 목록(PII 마스킹)·풀네임(성+이름) 분리검색·탭(정상/휴면/VIP)·가입일/등급 필터·가입일 정렬·페이지네이션 Playwright 실DB 검증 |
| customers.create | 회원 생성 | DONE | MATCH | REST | 회원 | — | 등록 드로어(이메일 필수+성/이름/전화) end-to-end 검증 |
| customers.detail(주문이력/주소) | 회원 상세 | DONE | MATCH | REST | 회원 | — | 상세 드로어(기본정보+그룹+주소+주문이력), PII "원문 보기" 토글 |
| customers.edit | 회원 수정 | DONE | MATCH | REST | 회원 | — | 성/이름/전화/회사명 인라인 편집(company_name DB 검증) |
| customers.create-address | 주소 추가 | DONE | MATCH | REST | 회원 | — | 상세 내 주소 추가(우편번호/주소/도시/전화) → customer_address DB 검증 |
| customers.add-customer-group | 그룹 지정 | DONE | MATCH | REST | 회원 | — | 회원 그룹 탭 상세에서 회원 검색→추가/제외(customer_group_customer DB 검증) |
| customers.metadata | 메타데이터 | TODO | MATCH | REST | 회원 | — | 후속 |
| (보강) 멤버십 등급(자동등급·등급별 적립률/쿠폰·연초리셋) | 멤버십 | TODO | GAP_B | MODULE | 회원 | ours-only/membership.md | membership module |
| (보강) 현금영수증/세금계산서(신청·발급·정정·취소 승인) | 증빙 | TODO | GAP_B | MODULE | 회원 | ours-only/tax-receipt.md | tax-receipt module |
| (보강) 블랙리스트·제재(단계 제재·사유분류·진행중 주문 처리) | 제재 | TODO | GAP_B | MODULE | 회원 | ours-only/sanction.md | sanction module |
| (보강) 동의이력 | 동의 관리 | TODO | GAP_B | MODULE | 회원 | ours-only/consent-history.md | |

### 11) customer-groups → **회원 관리**(하위)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| customer-groups.list / create / detail / edit | 회원 그룹 | DONE | MATCH | REST | 회원 | — | /members 회원 그룹 탭 — 목록(회원수)·생성·이름수정·삭제 Playwright 실DB 검증 |
| customer-groups.add-customers | 회원 추가 | DONE | MATCH | REST | 회원 | — | 그룹 상세 내 회원 검색→추가/제외(customer_group_customer DB 검증) |
| customer-groups.metadata | 메타데이터 | TODO | MATCH | REST | 회원 | — | 후속 |

### 12) reservations → **상품 관리**(재고 예약/할당, GAP_A)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| reservations.list / create / detail / edit | 예약/할당 화면 | TODO | GAP_A | REST | 상품 | medusa-only/reservations.md | 주문 allocate-items 연동 |
| reservations.metadata | 메타데이터 | TODO | GAP_A | REST | 상품 | medusa-only/reservations.md | |

### 13) inventory → **상품 관리**(재고)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| inventory.list / create / detail | 재고 목록·상세 | TODO | MATCH | REST | 상품 | — | |
| inventory.edit-item / edit-attributes | 항목·속성 수정 | TODO | MATCH | REST | 상품 | — | |
| inventory.manage-locations | 위치 관리 | TODO | MATCH | REST | 상품 | — | |
| inventory.adjust(증감) | 재고 증감 | TODO | MATCH | REST | 상품 | — | |
| inventory.stock(대량조정/추이) | 대량 조정 | TODO | MATCH | REST | 상품 | — | |
| inventory.metadata | 메타데이터 | TODO | MATCH | REST | 상품 | — | |

### 14) profile → **쇼핑몰 설정**(내 계정)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| profile.detail / edit(이름/이메일/비번) | 내 계정 | TODO | MATCH | REST | 설정 | — | |

---

## 2. 설정 (settings 레이아웃) → 우리 메뉴: **쇼핑몰 설정**

### 15) store
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| store.detail / edit(통화/지역/기본채널) | 스토어 기본설정 | TODO | MATCH | REST | 설정 | — | |
| store.add-currencies / add-locales | 통화·로케일 추가 | TODO | MATCH | REST | 설정 | — | |
| store.metadata | 메타데이터 | TODO | MATCH | REST | 설정 | — | |

### 16) users
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| users.list / detail / edit(역할/활성) | 관리자 계정 | TODO | MATCH | REST | 설정 | — | RBAC와 연동 |
| users.invite | 관리자 초대 | TODO | MATCH | REST | 설정 | — | |
| users.metadata | 메타데이터 | TODO | MATCH | REST | 설정 | — | |

### 16.5) admin-2fa → **쇼핑몰 설정 > 2단계 인증(2FA)** (신규, GAP_B)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| (없음) | 2FA 등록(QR/수동키)·활성화·해제 | DONE | GAP_B | MODULE | 설정 | ours-only/admin-2fa.md | `admin-2fa` 모듈(`admin_totp`), `POST /admin/2fa/setup|activate`, 순수 JS TOTP(RFC6238) |
| (없음) | 로그인 2단계 검증·서버측 게이팅 | DONE | GAP_B | MODULE+WRAP | 설정 | ours-only/admin-2fa.md | `POST /admin/2fa/verify` + `twoFactorGuard` 미들웨어(미검증 토큰 `/admin/*` 403), `admin_totp_session` |
| (없음) | 백업(복구) 코드·시크릿 암호화 | DONE | GAP_B | MODULE | 설정 | ours-only/admin-2fa.md | 1회용 코드 10개(`admin_2fa_backup_code`, 해시), 시크릿 AES-256-GCM(`_utils/secret-crypto.ts`) |

### 17) regions
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| regions.list / create / detail / edit | 지역(국내 단순화) | TODO | GAP_A | REST | 설정 | medusa-only/regions-tax.md | |
| regions.add-countries / metadata | 국가·메타 | TODO | GAP_A | REST | 설정 | medusa-only/regions-tax.md | |

### 18) tax-regions
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| tax-regions.list / create / detail / edit / metadata | 세금 지역 | TODO | GAP_A | REST | 설정 | medusa-only/regions-tax.md | 국내 VAT 단순 |
| tax-regions.province-create / detail | 시도 | TODO | GAP_A | REST | 설정 | medusa-only/regions-tax.md | |
| tax-regions.tax-rate-create / edit | 세율 | TODO | GAP_A | REST | 설정 | medusa-only/regions-tax.md | |
| tax-regions.tax-override-create / edit | 세금 예외 | TODO | GAP_A | REST | 설정 | medusa-only/regions-tax.md | |

### 19) sales-channels
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| sales-channels.list / create / detail / edit | 판매채널(단독몰=1) | TODO | GAP_A | REST | 설정 | medusa-only/sales-channels.md | 네이버/마켓 확장 대비 |
| sales-channels.add-products / metadata | 상품 연결·메타 | TODO | GAP_A | REST | 설정 | medusa-only/sales-channels.md | |

### 20) locations
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| locations.list / create / detail / edit | 창고/출고지(초기 1곳) | DONE | GAP_A | REST | 배송 | medusa-only/locations-shipping.md | /shipping 출고지/창고 탭 — 목록·등록(주소)·상세 인라인 수정·삭제 Playwright 실DB 검증. 시드: 서울 물류센터(KR) |
| locations.sales-channels(할당) | 채널 할당 | TODO | GAP_A | REST | 배송 | medusa-only/locations-shipping.md | 설정(판매채널) 연계 후속 |
| locations.fulfillment-providers | 배송 공급자 | DONE | GAP_A | REST | 배송 | medusa-only/locations-shipping.md | 출고지 등록 시 manual_manual 자동 활성화(배송옵션 생성 전제) |
| locations.metadata | 메타데이터 | TODO | GAP_A | REST | 배송 | medusa-only/locations-shipping.md | 후속 |

### 21) shipping-profiles
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| shipping-profiles.list / create / detail / metadata | 배송 프로파일 | DONE | GAP_A | REST | 배송 | medusa-only/locations-shipping.md | 배송 옵션 생성 시 기본 프로파일 사용(list·create API 제공). detail/metadata 후속 |

### 22) shipping-option-types
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| shipping-option-types.list / create / detail / edit | 배송 옵션 유형 | TODO | GAP_A | REST | 배송 | medusa-only/locations-shipping.md | |

### 23) service-zone (locations 내)
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| service-zone.create / edit / manage-areas | 서비스 구역 | DONE | GAP_A | REST | 배송 | medusa-only/locations-shipping.md | /shipping 배송 옵션 탭 — 서비스 구역 추가(국가 geo_zones)·삭제 실DB 검증. 시드: 국내(대한민국) |
| service-zone.shipping-option-create / edit | 배송 옵션 | DONE | GAP_A | REST | 배송 | medusa-only/locations-shipping.md | 구역별 배송 옵션 생성(type 인라인)·삭제. 시드: 기본 택배/제주·도서산간 |
| service-zone.shipping-option-pricing(지역/금액별) | 배송비 책정 | DONE | GAP_A | REST | 배송 | medusa-only/locations-shipping.md | 정액(flat) 통화별 배송비(store 지원통화 동적, 하드코딩 X) |
| (보강) 국내 택배(CJ·우체국)·기본택배사·운송장 CSV 일괄 | 국내 배송 | DONE | GAP_B | MODULE | 배송 | ours-only/delivery-kr.md | /shipping 국내 택배사 탭 — 택배사 목록(CJ·우체국·한진·롯데·로젠)·사용여부·기본 택배사 store.metadata 영속. **택배사 API 연동은 mock(미구현)** · 운송장 CSV는 후속 |
| (보강) 반품·교환 검수(신청→수거→검수→완료/거절·자동알림·차액) | 반품 검수 | TODO | GAP_B | MODULE | 배송 | ours-only/rma-inspection.md | 주문 반품 흐름과 연계 후속(rma-extension 활용) |

### 24) product-tags
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| product-tags.list / create / detail / edit / metadata | 상품 태그 | DONE | GAP_A | REST | 카테고리 | medusa-only/tags-types.md | /categories 태그 탭 — 인라인 추가·수정·삭제(연결 상품수 표시) Playwright 실DB 검증. metadata 후속 |

### 25) product-types
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| 상품 분류 체계(상품군/유형/분류 + 옵션템플릿 + 고시필수항목) | 상품 분류 체계(/product-types) | DONE | GAP_B | MODULE | 카테고리 | ours-only/product-classification.md | 기존 product-type 모듈 활용 · 코어 충돌 회피 위해 API=/admin/catalog-types · 트리·생성·옵션/고시 추가·삭제 검증 |

### 26) api-key-management
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| api-key.(Publishable) list / create / detail / edit / sales-channels | API/연동 키 | TODO | GAP_A | REST | 설정 | medusa-only/api-keys.md | publishable=스토어프론트 |
| api-key.(Secret) 동일 구성 | 시크릿 키 | TODO | GAP_A | REST | 설정 | medusa-only/api-keys.md | |

### 27) return-reasons
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| return-reasons.list / create / edit | 반품 사유 코드 | TODO | GAP_A | REST | 설정 | medusa-only/reasons.md | 반품 프로세스 연동 |

### 28) refund-reasons
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| refund-reasons.list / create / edit | 환불 사유 코드 | TODO | GAP_A | REST | 설정 | medusa-only/reasons.md | |

### 29) workflow-executions
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| workflow-executions.list / detail(단계별 입출력/상태) | 워크플로우 로그 | TODO | GAP_A | REST | 설정 | medusa-only/workflow-executions.md | 운영 모니터링 |

### 30) translations
| Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| translations.list / settings / edit / add-locales | 번역(보류) | TODO | GAP_A | — | 설정 | medusa-only/translations.md | 한국어 단독·아키텍처만 대비(feature-flag) |

---

## 3. 인증·기타

| # | Medusa 기능(화면·액션) | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 도메인 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|---|
| 31 | login | 로그인 | DOING | MATCH | REST | 설정 | — | Phase 0 스캐폴드 구현 |
| 32 | reset-password(토큰) | 비밀번호 초기화 | TODO | MATCH | REST | 설정 | — | |
| 33 | invite(토큰 수락) | 초대 수락 | TODO | MATCH | REST | 설정 | — | |
| 34 | no-match | 404 | TODO | MATCH | — | 설정 | — | |
| 35 | gift-cards | 기프트카드(채택 미정) | TODO | GAP_A | REST | 설정 | medusa-only/gift-cards.md | 플러그인 의존 — 채택 결정 후 |

---

## 4. 횡단(cross-cutting) — 기반 도메인 (모든 도메인 의존, 최우선)

| 기능 | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 모듈 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| 관리자 권한(RBAC) — SUPER/OPERATION/CS/MARKETER + 메뉴·기능별 CRUD 2계층 | 권한 관리 | DONE | GAP_B | MODULE | rbac | ours-only/rbac.md | rbac 모듈 + middlewares.ts 권한검사(write 403 + 보안메뉴 read super 전용 + 점검모드 super 필요) + /permissions 화면 |
| 감사 로그 — 모든 write append-only·5년·PII 마스킹 | 감사 로그 조회 | DONE | GAP_B | MODULE | audit | ours-only/audit-log.md | audit 모듈 + middlewares.ts 기록 + PII 마스킹(검증) + /audit-logs 화면 |
| 정책 저장소 — system_policies 통합·이중확인·변경이력(SUPER) | 정책 관리 | DONE | GAP_B | MODULE | policy | ours-only/policy-store.md | policy 모듈 + 이중확인(409) + 변경이력 + /policies 화면 |
| 관리자 2FA(TOTP) — 서버측 세션 게이팅·백업코드·시크릿 암호화·QR | 2단계 인증 | DONE | GAP_B | MODULE+WRAP | admin-2fa | ours-only/admin-2fa.md | §16.5 참조. `twoFactorGuard` 미들웨어가 미검증 토큰 `/admin/*` 403 |
| 보안 하드닝 — 주문 IDOR 가드·인증/검색어 rate limit·비밀번호 정책·입력 길이 상한·보안 헤더/CSP | (횡단) | DONE | GAP_B | WRAP | (middlewares/_utils) | ours-only/security-hardening.md | `middlewares.ts`(IDOR·rate limit·비번정책) + `_utils/{rate-limit,text,secret-crypto}.ts` + next.config CSP. rate limit은 캐시 추상화(Redis-ready) |

---

## 5. 마케팅 (신규 메뉴) → 우리 메뉴: **마케팅** (전체 GAP_B)

| 기능 | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 모듈 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| 이메일([광고]·List-Unsubscribe·야간차단·동의자만) | 이메일 발송 | TODO | GAP_B | MODULE | notification/segment | ours-only/marketing-send.md | notification provider |
| SMS | SMS 발송 | TODO | GAP_B | MODULE | notification | ours-only/marketing-send.md | |
| 카카오 알림톡(이벤트별 ON/OFF) | 알림톡 | TODO | GAP_B | MODULE | notification | ours-only/marketing-send.md | |
| 세그먼트 | 대상 세그먼트 | TODO | GAP_B | MODULE | segment | ours-only/marketing-send.md | |
| CMS(공지/FAQ/배너/팝업·노출기간·우선순위·긴급고정·SVG 검증) | CMS | TODO | GAP_B | MODULE | cms | ours-only/cms.md | |

---

## 6. 통계·리포트 → 우리 메뉴: **통계·리포트**

| 기능 | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 모듈 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| orders/products 집계 | 매출·상품·회원 통계 | TODO | MATCH | WRAP | — | — | |
| 매출리포트 자동발송 | 리포트 스케줄 | TODO | GAP_B | MODULE | system/ops | ours-only/report-schedule.md | |

---

## 7. 시스템 운영 → **쇼핑몰 설정**(하위, GAP_B)

| 기능 | 우리 화면 대응 | 상태 | 갭유형 | 연동 | 모듈 | 문서경로 | 비고 |
|---|---|---|---|---|---|---|---|
| 점검모드(scope) | 점검 모드 | DONE | GAP_B | MODULE | system/ops | ours-only/system-ops.md | /admin/ops/maintenance 토글(super 전용) |
| 헬스(DB/Redis polling) | 헬스 모니터 | TODO | GAP_B | MODULE | system/ops | ours-only/system-ops.md | |
| 약관관리 | 약관 | TODO | GAP_B | MODULE | policy | ours-only/policy-store.md | |
| CS 통합이력 | CS 이력 | TODO | GAP_B | MODULE | system/ops | ours-only/system-ops.md | |

---

## 8. 집계 (Phase 0 시점, 상태 전부 TODO/DOING)

| 갭유형 | 행 수(개략) | 의미 |
|---|---|---|
| MATCH | 약 70 | Medusa REST/WRAP 호출로 충족 |
| GAP_A | 약 45 | Medusa 有·우리 자리 미정 → 신규 화면 설계까지 이전(드롭 금지) |
| GAP_B | 약 35 | 우리 要求有·Medusa無 → custom module + `(메두사기능없음)` 배지 |

> 행 수는 화면·액션 기준 개략치(세부 액션 분해 시 가변). **누락 0 원칙** — 신규 Medusa 라우트/우리 요구 발견 시 즉시 행 추가.
