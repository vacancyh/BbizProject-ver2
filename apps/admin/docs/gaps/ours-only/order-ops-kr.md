# [갭 문서] 한국형 주문 운영(order-ops-kr)

> 상태: **DONE**(강제취소·내부메모) / 정산연동 후속. FEATURE_MATRIX §1.6 "(보강) 강제취소·내부메모".

## 1. 분류
- **갭유형**: GAP_B (우리 要求有 · Medusa core 無)
- **도메인**: 주문
- **우리 메뉴 위치**: 운영 → 주문 관리(`/orders`) 상세 드로어
- **FEATURE_MATRIX 행**: §1.6 "(보강) 강제취소·내부메모"

## 2. 기능 설명
- **내부 메모**: 주문별 고객 비노출 관리자 메모. 작성자/시각 기록.
- **강제취소**: 사유를 내부 메모(kind=cancel)로 남기고 Medusa `cancelOrderWorkflow` 를 호출(래핑)해 주문 취소. 이중확인 필수.

## 3. 필요 데이터
- `order_admin_note`(order_id/content/kind(memo|cancel|system)/author_id/author_email). Medusa order 는 미수정(order_id text 연결).
- ⚠️ 모델 키 = `OrderAdminNote`(Note). "Memo"는 MedusaService 런타임 pluralize("Memos")와 TS 타입생성("Memoes")이 불일치(o-종결 단어 버그) → Note 로 회피.

## 4. Medusa API 여부
- **내부 메모**: Medusa 없음 → **MODULE**(custom) `backend/services/api/src/modules/order-ops-kr`.
- **강제취소**: Medusa `cancelOrderWorkflow`(core-flows) **호출/래핑** — 재구현 금지. wrap `src/api/admin/orders-kr/[id]/cancel`.

## 5. 우리 화면 설계 (구현됨)
- 주문 상세 드로어: "관리자 메모(고객 비노출)" textarea + 이력 목록(memo/cancel/system 구분), footer "주문 강제취소"(danger, ConfirmModal 이중확인)·"메모 저장".
- 목록/상세는 Medusa REST `/admin/orders` 직접 호출. 통화는 currency_code 로 표기(EUR 시드 — 하드코딩 금지).

## 6. 구현 결과
- [x] BE: `modules/order-ops-kr`(model + service + migration) + `medusa-config` 등록 + `src/api/admin/orders-kr/[id]/{memos,cancel}` + 미들웨어 메뉴 매핑(orders)
- [x] FE: `app/(admin)/orders/page.tsx` + `lib/api/orders.ts` + `lib/orders/status.ts`
- [x] 검증: typecheck/build + Playwright 실 DB 렌더(주문 6건 + 상세) + **메모 추가**(order_admin_note) + **강제취소**(order #2 status=canceled, 사유 메모) + 이중확인 409 + 감사로그 2건 + PII 마스킹(UI)
- [x] FEATURE_MATRIX 갱신
- [ ] 정산연동 = settlement 도메인 구현 후 연계(후속)

## 7. 심층 액션 추가 구현 (2026-06-01, MATCH·Medusa REST)
prototype 미설계분을 Medusa REST 기준으로 직접 설계·구현·실측 완료:
- **출고(fulfillment)** DONE — `/admin/orders/:id/fulfillments`(#1·#4 fulfilled)
- **송장 등록(shipment)** DONE — `…/fulfillments/:fid/shipments` 택배사+송장번호(#4 shipped, tracking "CJ대한통운 998877")
- **배송 완료(mark-as-delivered)** DONE — `…/fulfillments/:fid/mark-as-delivered`(#1 delivered)
- **환불(refund)** DONE — `/admin/payments/:id/capture`→`/refund`(미캡처 시 캡처 선행, #3 partially_refunded). 금액 입력(미입력=전액).
- 상세 드로어가 상태기반으로 액션 노출(미출고→출고 / 출고됨→송장 / 배송중→배송완료 / 결제존재→환불).

## 8. 후속(여전히 미구현 — 대형 흐름, prototype 미설계)
반품(return)·교환(exchange)·클레임(claim)·주문수정(order-edit)·이관(transfer)·주소/이메일 수정(order-edit 워크플로우 경유)·수기주문(draft order 빌더)·재고할당(allocate) = Medusa order-edit/draft 워크플로우 기반 대형 UI → 별도 슬라이스 설계 필요.
