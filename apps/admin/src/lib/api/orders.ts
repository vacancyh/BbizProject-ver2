/**
 * 주문 API 호출 레이어.
 *  - 목록/상세 = Medusa REST /admin/orders 직접 호출(1순위 REST, 로직 복사 X)
 *  - 내부메모/강제취소 = 한국형 wrap /admin/orders-kr (order-ops-kr 모듈)
 *  - 출고/환불 = Medusa REST 워크플로우 엔드포인트 호출
 * 통화는 currency_code 를 데이터에서 읽어 표기(하드코딩 금지).
 */
import { apiFetch } from "./client";
import { buildOrderListQuery } from "@/lib/orders/order-list-logic";
import type { StateEvent } from "@/lib/orders/order-detail-logic";

export type OrderListItem = {
  id: string;
  display_id: number;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  total: number;
  currency_code: string;
  email: string | null;
  created_at: string;
  customer?: { first_name?: string | null; last_name?: string | null } | null;
  items?: { quantity: number }[];
};

export type OrderFulfillment = {
  id: string;
  packed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  canceled_at: string | null;
  labels?: { tracking_number: string | null }[];
};

export type OrderPayment = {
  id: string;
  amount: number;
  captured_at: string | null;
  refunds?: { amount: number }[];
};

export type OrderPaymentCollection = {
  id: string;
  amount: number;
  status: string;
  payments?: OrderPayment[];
};

export type OrderDetail = Omit<OrderListItem, "items"> & {
  items: OrderLineItem[];
  shipping_address?: Address | null;
  billing_address?: Address | null;
  shipping_methods?: { name: string; amount: number }[];
  fulfillments?: OrderFulfillment[];
  payment_collections?: OrderPaymentCollection[];
  subtotal?: number;
  /** 상품만의 합계(배송비 제외) — Medusa subtotal 은 배송비를 포함하므로 상품 합계 표시엔 이 값을 사용 */
  item_subtotal?: number;
  shipping_total?: number;
  tax_total?: number;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export type OrderLineItem = {
  id: string;
  product_title: string;
  variant_title: string | null;
  variant_sku: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  thumbnail: string | null;
};

export type Address = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address_1?: string | null;
  address_2?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
};

export type OrderMemo = {
  id: string;
  order_id: string;
  content: string;
  kind: "memo" | "cancel" | "system";
  author_id: string | null;
  author_email: string | null;
  created_at: string;
};

const LIST_FIELDS =
  "id,display_id,status,payment_status,fulfillment_status,total,currency_code,email,created_at,*customer,items.quantity";

const DETAIL_FIELDS =
  "id,display_id,status,payment_status,fulfillment_status,total,subtotal,item_subtotal,shipping_total,tax_total,currency_code,email,created_at," +
  "*customer,*shipping_address,*billing_address,*shipping_methods," +
  // items.total(계산필드)을 단독 열거하면 Medusa 주문 total 계산이 어긋나(quantity=null·total 절반) D1 결함 발생.
  // items.* 로 라인아이템 전체를 로드하면 order.total·items.total 모두 정상. (call/wrap, 로직 복사 X)
  "items.*," +
  "fulfillments.id,fulfillments.packed_at,fulfillments.shipped_at,fulfillments.delivered_at,fulfillments.canceled_at,fulfillments.labels.tracking_number," +
  "payment_collections.id,payment_collections.amount,payment_collections.status," +
  "payment_collections.payments.id,payment_collections.payments.amount,payment_collections.payments.captured_at,payment_collections.payments.refunds.amount";

export type OrderListParams = {
  q?: string;
  limit?: number;
  offset?: number;
  /** 주문 상태 필터 — status enum 화이트리스트 적용(buildOrderListQuery) */
  status?: string;
  /** 기간 시작 (YYYY-MM-DD 또는 ISO) */
  from?: string;
  /** 기간 종료 (YYYY-MM-DD 또는 ISO) */
  to?: string;
};

/** 주문 목록(Medusa REST). */
export function listOrders(
  params: OrderListParams = {}
): Promise<{ orders: OrderListItem[]; count: number }> {
  // buildOrderListQuery 로 status 화이트리스트·기간 검증·쿼리 변환
  const queryParams = buildOrderListQuery({
    q: params.q,
    status: params.status,
    from: params.from,
    to: params.to,
    limit: params.limit,
    offset: params.offset,
  });
  const qs = new URLSearchParams({ fields: LIST_FIELDS });
  for (const [k, v] of Object.entries(queryParams)) {
    qs.set(k, v);
  }
  qs.set("order", "-display_id");
  return apiFetch(`/admin/orders?${qs.toString()}`);
}

/** 주문 검색 파라미터 — 결제/배송상태 필터 포함(한국형 보강). */
export type OrderSearchParams = OrderListParams & {
  /** 결제상태(captured/not_paid/partially_refunded/refunded/awaiting/canceled …) */
  payment_status?: string;
  /** 배송상태(not_fulfilled/fulfilled/shipped/delivered/canceled …) */
  fulfillment_status?: string;
};

/**
 * 주문 검색(한국형 — 결제/배송상태 필터 보강).
 * 코어 /admin/orders 는 payment_status·fulfillment_status 서버 필터를 지원하지 않으므로
 * 커스텀 /admin/orders-kr/search 사용(결과/count 정확).
 */
export function searchOrders(
  params: OrderSearchParams = {}
): Promise<{ orders: OrderListItem[]; count: number }> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.payment_status) qs.set("payment_status", params.payment_status);
  if (params.fulfillment_status) qs.set("fulfillment_status", params.fulfillment_status);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  qs.set("limit", String(params.limit ?? 20));
  qs.set("offset", String(params.offset ?? 0));
  return apiFetch(`/admin/orders-kr/search?${qs.toString()}`);
}

/** 주문 상세(Medusa REST). */
export function getOrder(id: string): Promise<{ order: OrderDetail }> {
  const qs = new URLSearchParams({ fields: DETAIL_FIELDS });
  return apiFetch(`/admin/orders/${id}?${qs.toString()}`);
}

/**
 * 주문 상태 전이 이력 조회 (BE 워커 신설 중 — try/catch guard 로 실패해도 본문 정상 렌더).
 * GET /admin/orders/:id/history
 */
export function getOrderHistory(
  orderId: string
): Promise<{ state_history: StateEvent[] }> {
  return apiFetch(`/admin/orders/${orderId}/history`);
}

/** 내부 메모 목록(한국형 wrap). */
export function listMemos(orderId: string): Promise<{ memos: OrderMemo[]; count: number }> {
  return apiFetch(`/admin/orders-kr/${orderId}/memos`);
}

/** 내부 메모 추가(한국형 wrap). */
export function addMemo(orderId: string, content: string): Promise<{ memo: OrderMemo }> {
  return apiFetch(`/admin/orders-kr/${orderId}/memos`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

/** 내부 메모 삭제(한국형 wrap). 본인/SUPER만 허용, 타인 403. */
export function deleteMemo(orderId: string, nid: string): Promise<{ deleted: boolean; id: string }> {
  return apiFetch(`/admin/orders-kr/${orderId}/memos/${nid}`, {
    method: "DELETE",
  });
}

/** 주문 강제취소(한국형 wrap → Medusa cancelOrderWorkflow). 이중확인 필수.
 *  reason = "fraud"|"staff"|"inventory"|"other" (enum 필수).
 *  nonce = 멱등키용 UUID (선택, 제공 시 중복 제출 방지).
 */
export function forceCancel(
  orderId: string,
  reason: string,
  nonce?: string
): Promise<{ canceled: boolean; order_id: string; reason: string }> {
  return apiFetch(`/admin/orders-kr/${orderId}/cancel`, {
    method: "POST",
    body: JSON.stringify({ reason, confirm: true, ...(nonce ? { nonce } : {}) }),
  });
}

/** 출고 처리(Medusa REST — 전체 미출고 품목 fulfillment 생성). */
export function createFulfillment(
  orderId: string,
  items: { id: string; quantity: number }[]
): Promise<unknown> {
  return apiFetch(`/admin/orders/${orderId}/fulfillments`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

/** 송장 등록(Medusa REST — fulfillment 을 발송 처리 + 운송장). */
export function createShipment(
  orderId: string,
  fulfillmentId: string,
  items: { id: string; quantity: number }[],
  carrier: string,
  trackingNumber: string
): Promise<unknown> {
  return apiFetch(`/admin/orders/${orderId}/fulfillments/${fulfillmentId}/shipments`, {
    method: "POST",
    body: JSON.stringify({
      items,
      labels: [
        {
          tracking_number: `${carrier} ${trackingNumber}`.trim(),
          tracking_url: "",
          label_url: "",
        },
      ],
    }),
  });
}

/** 배송 완료 처리(Medusa REST — fulfillment mark-as-delivered). */
export function markDelivered(orderId: string, fulfillmentId: string): Promise<unknown> {
  return apiFetch(`/admin/orders/${orderId}/fulfillments/${fulfillmentId}/mark-as-delivered`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** 결제 캡처(Medusa REST — 환불 전 미캡처 결제 캡처). */
export function capturePayment(paymentId: string): Promise<unknown> {
  return apiFetch(`/admin/payments/${paymentId}/capture`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** 환불(Medusa REST — 캡처된 결제 환불). */
export function refundPayment(paymentId: string, amount: number): Promise<unknown> {
  return apiFetch(`/admin/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

/** 주문 환불 요청 바디 (한국형 커스텀 route). */
export type RefundOrderPayload = {
  /** 부분환불 대상 라인 배열. 미전달 시 전액환불 (amount 사용). */
  items?: { id: string; amount: number }[];
  /** 전액 환불 금액 (items 미전달 시 사용). */
  amount?: number;
  /**
   * 멱등 nonce (클라이언트 제공 UUID 등, 필수).
   * 백엔드가 "{orderId}:refund:{nonce}" 형식으로 정규화합니다 (spec I2).
   * nonce 또는 idempotency_key 중 하나는 반드시 전달해야 합니다.
   */
  nonce?: string;
  /**
   * 레거시 멱등키 필드 — nonce 미전달 시 nonce 대체값으로 사용됩니다.
   * 신규 호출에서는 nonce 를 사용하세요.
   */
  idempotency_key?: string;
  /** 환불 수단: pg | account */
  refund_method: "pg" | "account";
  /** 계좌 입금 시 은행·계좌·예금주 */
  account_info?: Record<string, unknown> | null;
  /** 쿠폰 할인액(비례배분 계산용) */
  coupon_discount?: number;
  /** 포인트 사용액(비례배분 계산용) */
  point_discount?: number;
  /** 배송비(비례배분 계산용) */
  shipping_fee?: number;
  /** 전체 주문 라인 합계(비례배분 기준) */
  total_line_amount?: number;
  /** 환불 사유 */
  reason?: string;
};

/** 주문 환불 응답 */
export type RefundOrderResult = {
  order_id: string;
  refund_amount: number;
  refund_method: "pg" | "account";
  status: "refunded" | "pending";
  reshipping_fee: number;
  reshipping_required: boolean;
};

/**
 * 주문 환불 실행 (한국형 커스텀 route).
 *
 * POST /admin/orders/:id/refund
 * 멱등키 중복 시 409 + 캐시 응답 반환.
 * spec: dag/d2_주문관리/t007_환불.md §6 API1
 */
export function refundOrder(
  orderId: string,
  payload: RefundOrderPayload
): Promise<RefundOrderResult> {
  return apiFetch(`/admin/orders/${orderId}/refund`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ─── 주문 수정(Order Edit) — Medusa 코어 직접 호출(§V0-5 커스텀 route 금지) ──────

/** 주문 수정 변경 레코드(코어 order_change) */
export type OrderChange = {
  id: string;
  order_id: string;
  status: string;
  version?: number;
};

/**
 * 주문 수정 시작 — order change(pending) 생성.
 * POST /admin/order-edits (Medusa 코어). spec t008 §6 API1.
 */
export function createOrderEdit(orderId: string): Promise<{ order_change: OrderChange }> {
  return apiFetch("/admin/order-edits", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId }),
  });
}

/**
 * 주문 수정 — 기존 라인 수량 변경(0 = 삭제).
 * POST /admin/order-edits/:orderId/items/item/:itemId (Medusa 코어).
 * ★ path 의 id 는 order_change id 가 아니라 **order_id** 임에 주의(코어 계약).
 */
export function updateOrderEditItem(
  orderId: string,
  itemId: string,
  quantity: number
): Promise<unknown> {
  return apiFetch(`/admin/order-edits/${orderId}/items/item/${itemId}`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}

/**
 * 주문 수정 확정 — OrderChange confirm + version 증가 + summary 재계산.
 * POST /admin/order-edits/:orderId/confirm (Medusa 코어). spec t008 §6 API2.
 * ★ path 의 id 는 **order_id**.
 */
export function confirmOrderEdit(orderId: string): Promise<unknown> {
  return apiFetch(`/admin/order-edits/${orderId}/confirm`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * 주문 수정 요청(확정 전 request 단계 — 코어 일부 버전 요구).
 * POST /admin/order-edits/:orderId/request (Medusa 코어). ★ path 의 id 는 **order_id**.
 */
export function requestOrderEdit(orderId: string): Promise<unknown> {
  return apiFetch(`/admin/order-edits/${orderId}/request`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * 주문 수정 취소 — 미확정(pending/requested) order_change 제거.
 * DELETE /admin/order-edits/:orderId (Medusa 코어 cancelBeginOrderEditWorkflow).
 * ★ path 의 id 는 order_change id 가 아니라 **order_id** 임에 주의(코어 계약).
 * 중간 단계 실패 시 활성 change 잔존("already has an existing active order change")을
 * 방지하는 롤백 용도(§V0 재발방지).
 */
export function cancelOrderEdit(orderId: string): Promise<unknown> {
  return apiFetch(`/admin/order-edits/${orderId}`, {
    method: "DELETE",
  });
}

/**
 * 주문 이메일 수정(Medusa 코어 POST /admin/orders/:id). spec t008 §5 A3.
 */
export function updateOrderEmail(orderId: string, email: string): Promise<unknown> {
  return apiFetch(`/admin/orders/${orderId}`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/**
 * 주문 배송지 수정(Medusa 코어 POST /admin/orders/:id). spec t008 §5 A3.
 */
export function updateOrderShippingAddress(
  orderId: string,
  address: Address
): Promise<unknown> {
  return apiFetch(`/admin/orders/${orderId}`, {
    method: "POST",
    body: JSON.stringify({ shipping_address: address }),
  });
}

// ─── 반품(Return) ───────────────────────────────────────────────────────────

export type ReturnItem = {
  id: string;
  /** 반품 요청 수량 */
  quantity: number;
  reason_id?: string | null;
  note?: string | null;
};

export type ReturnRecord = {
  id: string;
  order_id: string;
  display_id: number;
  status: string;
  refund_amount: number | null;
  created_at: string;
  requested_at: string | null;
  received_at: string | null;
  canceled_at: string | null;
};

export type ReturnReason = {
  id: string;
  label: string;
  value: string;
  description?: string | null;
};

/** 반품 사유 목록(Medusa REST). */
export function listReturnReasons(): Promise<{ return_reasons: ReturnReason[]; count: number }> {
  return apiFetch("/admin/return-reasons?limit=50");
}

/**
 * 반품 플로우(Medusa REST — 3단계):
 *  1. POST /admin/returns                              → return 생성(open 상태)
 *  2. POST /admin/returns/{id}/request-items           → 반품 항목 추가
 *  3. POST /admin/returns/{id}/request                 → 반품 접수 확정
 */
export async function createReturn(
  orderId: string,
  items: ReturnItem[]
): Promise<{ return_id: string }> {
  // 1. 반품 생성
  const created = await apiFetch<{ return: ReturnRecord }>("/admin/returns", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId }),
  });
  const returnId = created.return.id;

  // 2. 반품 항목 추가
  await apiFetch(`/admin/returns/${returnId}/request-items`, {
    method: "POST",
    body: JSON.stringify({
      items: items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        ...(it.reason_id ? { reason_id: it.reason_id } : {}),
        ...(it.note ? { note: it.note } : {}),
      })),
    }),
  });

  // 3. 반품 접수 확정
  await apiFetch(`/admin/returns/${returnId}/request`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  return { return_id: returnId };
}

// ─── 청약철회(7일, 전자상거래법 §17·§18 — withdrawal7Day 모듈 wrap) ────────────

/** 청약철회 사유 코드(모듈 enum 과 1:1). */
export type WithdrawalReasonCode = "simple_change" | "defect" | "wrong_item" | "other";

export type WithdrawalStatus = {
  /** 현재 시각 기준 청약철회 가능 여부 */
  eligible: boolean;
  /** 자격 레코드(없으면 = 배송 미완료 등 대상 아님) */
  eligibility: { id: string; delivered_at: string; eligible_until: string; is_eligible: boolean } | null;
  /** 청약철회 마감 시각(= delivered_at + 7일) */
  deadline: string | null;
  /** 신청 이력(최신 1건) */
  claimed: { id: string; reason: WithdrawalReasonCode; claimed_at: string } | null;
  /** 환불 SLA 마감(영업일 3일, §18 ①) — 신청 후에만 존재 */
  refund_sla: string | null;
};

/** 청약철회 자격 조회(한국형 wrap). */
export function getWithdrawal(orderId: string): Promise<WithdrawalStatus> {
  return apiFetch(`/admin/withdrawal/${orderId}`);
}

/** 청약철회 신청(한국형 wrap → claimWithdrawal). 이중확인 필수. */
export function claimWithdrawal(
  orderId: string,
  reason: WithdrawalReasonCode,
  description?: string
): Promise<{ claimed: boolean; record: { id: string; reason: WithdrawalReasonCode; claimed_at: string } }> {
  return apiFetch(`/admin/withdrawal/${orderId}/claim`, {
    method: "POST",
    body: JSON.stringify({ reason, description, confirm: true }),
  });
}

// ─── RMA 확장(반품정책·환불방식·배송비·검수 — rmaExtension 모듈 wrap) ──────────

/** 환불 방식 4종(모듈 enum 과 1:1). */
export type ReimbursementType = "REFUND" | "STORE_CREDIT" | "EXCHANGE" | "REPLACEMENT";

/** 반품 사유 4종(배송비 부담주체 판정 근거). */
export type RmaReturnReason =
  | "CUSTOMER_CHANGE_OF_MIND"
  | "PRODUCT_DEFECT"
  | "WRONG_DELIVERY"
  | "OTHER";

/** 검수 상태 등급 4종. */
export type ReturnCondition = "A_GRADE" | "B_GRADE" | "C_GRADE" | "DISPOSE";

export type ReturnsPolicyRecord = {
  id: string;
  name: string;
  window_days: number;
  restocking_fee_pct: number;
  shipping_fee_payer: "customer" | "seller" | "split";
  active: boolean;
};

/** 활성 반품 정책 조회(한국형 wrap). 미설정 시 policy=null. */
export function getReturnsPolicy(storeId?: string): Promise<{ policy: ReturnsPolicyRecord | null }> {
  const qs = storeId ? `?store_id=${encodeURIComponent(storeId)}` : "";
  return apiFetch(`/admin/rma/policy${qs}`);
}

/** 환불 방식 지정(한국형 wrap → ReimbursementMethod 생성). */
export function setReimbursement(
  returnId: string,
  type: ReimbursementType
): Promise<{ reimbursement: { id: string; type: ReimbursementType; amount: number; status: string } }> {
  return apiFetch(`/admin/rma/returns/${returnId}/reimbursement`, {
    method: "POST",
    body: JSON.stringify({ type }),
  });
}

/** 반품 배송비 부담주체 산출(한국형 wrap, 전자상거래법 §17 ②). */
export function assignReturnShippingFee(
  returnId: string,
  reason: RmaReturnReason
): Promise<{ reason: RmaReturnReason; payer: "CUSTOMER" | "SELLER"; amount: number | null }> {
  return apiFetch(`/admin/rma/returns/${returnId}/shipping-fee`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/**
 * 반품 수령 처리(Medusa REST — POST /admin/returns/:id/receive).
 * receiveReturnWorkflow 호출 래핑. status: requested → received / partially_received.
 */
export async function receiveReturn(
  returnId: string,
  items: { id: string; quantity: number }[]
): Promise<{ return: ReturnRecord }> {
  return apiFetch<{ return: ReturnRecord }>(`/admin/returns/${returnId}/receive`, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

/** 반품 검수 등록(한국형 wrap → ReturnInspection 생성). */
export function createReturnInspection(
  returnId: string,
  input: { resellable: boolean; condition: ReturnCondition; notes?: string }
): Promise<{ inspection: { id: string; resellable: boolean; condition: ReturnCondition } }> {
  return apiFetch(`/admin/rma/returns/${returnId}/inspection`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── 교환(Exchange) ─────────────────────────────────────────────────────────

export type ExchangeReturnItem = {
  /** order line item id */
  id: string;
  quantity: number;
  reason_id?: string | null;
  note?: string | null;
};

export type ExchangeAdditionalItem = {
  /** 신규 배송 variant id */
  variant_id: string;
  quantity: number;
  /** 단가(원) — 차액 계산에 사용 */
  unit_price?: number;
};

export type ExchangeDiffResult = {
  /** 총 차액(양수=추가결제, 음수=환불) */
  diff: number;
  lines: { id: string; diff: number }[];
  refund_total: number;
  additional_total: number;
};

/**
 * 단건 교환 생성(한국형 wrap → createExchangeWorkflow 래핑).
 * POST /admin/exchanges
 * spec: t005_교환.md §6 API1, unit_007 UT-001.
 */
export function createExchange(
  orderId: string,
  returnItems: ExchangeReturnItem[],
  additionalItems: ExchangeAdditionalItem[]
): Promise<{ exchange: unknown; price_diff: ExchangeDiffResult }> {
  return apiFetch("/admin/exchanges", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      return_items: returnItems,
      additional_items: additionalItems,
    }),
  });
}

export type ExchangeGroup = {
  id: string;
  order_id: string;
  total_price_diff: number;
  pickup_tracking_no: string | null;
  version: number;
  status: string;
  exchange_ids: string[];
  created_at: string;
};

/**
 * 다건 교환 그룹 생성(한국형 wrap → order-exchange-group 모듈).
 * POST /admin/exchanges/group
 * spec: t005_교환.md §6 API2, unit_007 UT-002.
 */
export function groupExchanges(
  orderId: string,
  exchangeIds: string[],
  pickupTrackingNo?: string
): Promise<{ group: ExchangeGroup }> {
  return apiFetch("/admin/exchanges/group", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      exchange_ids: exchangeIds,
      ...(pickupTrackingNo ? { pickup_tracking_no: pickupTrackingNo } : {}),
    }),
  });
}

// ─── 클레임(Claim) ──────────────────────────────────────────────────────────

/** 클레임 유형 (코어 Medusa claim.type 과 1:1) */
export type ClaimType = "replace" | "refund";

/** 클레임 라인 아이템 */
export type ClaimItem = {
  /** order line item id */
  id: string;
  quantity: number;
};

/** 클레임 레코드 */
export type ClaimRecord = {
  id: string;
  order_id: string;
  type: ClaimType;
  status: string;
  created_at: string;
};

/**
 * 클레임 생성 (Medusa 코어 POST /admin/claims — 직접 호출, 커스텀 route 없음).
 * spec: t006_클레임.md §6 API1.
 * §V0-5: 코어 /admin/claims 를 직접 호출. 커스텀 백엔드 route 생성 금지.
 *
 * @param orderId  주문 ID
 * @param type     클레임 유형 (replace | refund)
 * @param items    클레임 대상 라인 배열
 * @param evidence 증빙 파일명/참조 (d12 file 연동 전 — 필드만 전달)
 */
export function createClaim(
  orderId: string,
  type: ClaimType,
  items: ClaimItem[],
  evidence?: string | null
): Promise<{ claim: ClaimRecord }> {
  return apiFetch("/admin/claims", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      type,
      items,
      ...(evidence ? { evidence } : {}),
    }),
  });
}
