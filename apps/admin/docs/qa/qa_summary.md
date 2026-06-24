# QA 통합 요약 — 도메인별 동시 QA (2026-06-01)

> 완료 도메인 5개를 백그라운드 에이전트로 **동시 QA** + 신규 배송 도메인은 main 직접 검증.
> 모두 실제 admin(:7002) + 실 backend(:9000) + 실 DB 교차. 검증용 write는 전부 원복(soft-delete).

## 도메인별 판정

| 도메인 | 판정 | 결함 | 리포트 |
|---|---|---|---|
| 카테고리(진열·컬렉션·태그·분류체계) | PASS(조건부) | 0 (WARN 2: 라이브 데이터 부재 회귀공백) | qa_categories.md |
| 회원(회원·그룹·주소·PII) | PASS | 0 (WARN 2: 등록폼 회사명 누락·audit actor_email) | qa_members.md |
| 상품(목록·등록·상세·수정·미디어·가격·변형·고시) | PASS | 0 (WARN 1·INFO 1) | qa_products.md |
| 주문(목록·상세·출고·송장·환불·강제취소·메모) | **PASS** (D1 수정완료) | 0 (D1 ✅RESOLVED) + WARN 1 + 경미 2 | qa_orders.md |
| 쿠폰·프로모션(목록·생성·상세·규칙) | PASS | 0 (WARN 2: 그룹 시드부재·audit actor_email) | qa_coupons.md |
| 배송(출고지·옵션·배송비·국내택배) | PASS | 0 (WARN 2: 통화 KRW·택배사 mock) | qa_shipping.md |

## 즉시 주목 결함

### D1 (주문, FAIL → ✅ RESOLVED 2026-06-01) — 주문 #4 상세 총결제금액 불일치
- 증상: 목록·실결제는 €20.00이나 상세 드로어 총결제금액이 €10.00.
- **확정 원인(프런트, 코어 아님)**: detail 필드 선택이 계산필드 `items.total` 을 단독 열거 → Medusa 주문 total 계산이 어긋나 `quantity=null·total 절반(10)` 반환. 필드 조합별 재현으로 확정(`items.total` 명시 시만 깨짐, `items.*` 정상).
- **수정**: `apps/admin/src/lib/api/orders.ts` DETAIL_FIELDS 의 item 명시열거 → `items.*` 로 교체.
- **2차 동반 결함**: total 정상화 후 분해 행 불일치 노출(상품합계 €20 = Medusa `subtotal` 이 배송비 포함). → 상품 합계를 `item_subtotal`(상품만)로 매핑(`orders.ts` 타입·필드 + `orders/page.tsx`).
- **검증(실 admin+DB)**: 주문 #4 상세 = 상품합계 €10 + 배송비 €10 + 세금 €0 = 총 €20.00 (10+10+0=20 정합). 콘솔 에러 0. tsc 통과. 증거 `shots/d1-fixed-order4-total.png`.
- 백엔드 코어·DB 무수정(필드 선택 변경만).

## §V0 재발 방지 후보 (횡단)

### R1 — audit_log.actor_email 항상 NULL → ✅ RESOLVED 2026-06-01 (횡단 환류)
- 원인 레이어: **미들웨어** — `backend/services/api/src/api/middlewares.ts` `auditTap` 가 `actor_email: null` 하드코딩.
- **수정**: `auditTap` 의 `res.on("finish")` 핸들러를 async IIFE 화 → `actor_id` 로 `query.graph(entity:"user", fields:["email"])` 조회 후 record. policy 라우트와 동일 패턴. 실패는 격리(응답 무영향).
- **검증**: backend 재빌드(1.67s)+재시작 후 write 1건 발생 → 신규 audit 항목 `actor_email = s**@local.test`(PII 마스킹) 기록 확인. 수정 전 항목은 공란 유지(append-only).
- 환류 효과: 상품·회원·쿠폰·배송 등 **모든 /admin/* write** 가 행위자 email 기록 → 감사 무결성 횡단 개선. §V0 재발 차단 완료.

### R2 — /admin/stores(복수) 메뉴 매핑 누락 → ✅ RESOLVED 2026-06-01
- 증상: 국내 택배사 저장(`POST /admin/stores/:id`)이 audit 에 menu=null 로 기록(target_type 빈값).
- 원인: PATH_MENU_MAP 의 `/admin/store`(단수) prefix 가 `/admin/stores/:id`(복수)에 매칭 안 됨.
- **수정**: `middlewares.ts` PATH_MENU_MAP 에 `{ prefix: "/admin/stores", menu: "settings" }` 추가. backend 재빌드(1.89s)+재시작.
- **검증**: `POST /admin/stores/:id` 발생 → 신규 audit `action="POST settings", target_type="settings", actor_email="s**@local.test"` 기록 확인(이전 null→settings).

## 환경 메모

- 단일 Playwright 브라우저를 5개 QA 에이전트가 동시 사용 → 탭 경합(INFO). 각 에이전트가 atomic evaluate/soft-nav 폴링으로 우회. 제품 결함 아님.
- admin 은 `next dev` 구동(하이드레이션과 hard-navigate 경합 가능 — soft-nav 권장).
