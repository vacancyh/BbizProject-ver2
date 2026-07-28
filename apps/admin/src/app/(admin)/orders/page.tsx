"use client";

/**
 * 주문 관리 — 디자인 프로토타입(admin-screen-ops.js) SC.orders / DRAWERS.order / OPS.* 1:1 이식.
 *  ① pageHeader  ② filterbar  ③ segtabs + 테이블(checkbox/주문번호/주문일시/고객명/수량/결제금액/결제상태/주문상태/배송상태/송장/kebab)
 *  ④ tablefoot + pagination  ⑤ 주문 상세 DrawerDrawer  ⑥ 위험 액션 ConfirmModal(환불/취소/배송완료)
 * 데이터 = Medusa REST (src/lib/api/orders.ts 전용, mock 금지).
 */
import { useCallback, useEffect, useState } from "react";
import {
  Download,
  Truck,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { formatCurrency } from "@/lib/utils";
import {
  listOrders,
  searchOrders,
  getOrder,
  getOrderHistory,
  listMemos,
  addMemo,
  deleteMemo,
  forceCancel,
  createFulfillment,
  createShipment,
  markDelivered,
  capturePayment,
  refundPayment,
  refundOrder,
  getWithdrawal,
  claimWithdrawal,
  getReturnsPolicy,
  createReturn,
  receiveReturn,
  listReturnReasons,
  createExchange,
  groupExchanges,
  createClaim,
  createOrderEdit,
  updateOrderEditItem,
  confirmOrderEdit,
  cancelOrderEdit,
  updateOrderEmail,
  updateOrderShippingAddress,
  type OrderListItem,
  type OrderDetail,
  type OrderMemo,
  type OrderFulfillment,
  type OrderPayment,
  type WithdrawalStatus,
  type WithdrawalReasonCode,
  type ReturnsPolicyRecord,
  type ReturnItem,
  type ReturnReason,
  type RmaReturnReason,
  type ExchangeReturnItem,
  type ExchangeAdditionalItem,
  type ClaimType,
  type ClaimItem,
  type RefundOrderPayload,
  type Address,
} from "@/lib/api/orders";
import {
  createDraftOrder,
  convertDraftOrder,
  listRegions,
  type Region,
  type DraftOrderItemInput,
} from "@/lib/api/draft-orders";
import {
  canEditOrder,
  validateOrderEditEmail,
  validateShippingAddressInput,
  buildItemQuantityChanges,
  calcOrderEditDiff,
  type OrderLineQuantityEdit,
} from "@/lib/orders/order-edit-logic";
import {
  validateDraftOrderInput,
  calcDraftOrderTotal,
  type DraftOrderLineInput,
} from "@/lib/orders/draft-order-logic";
import {
  calcRefundPreview,
  calcReshippingPreview,
  type RefundPreviewResult,
} from "@/lib/orders/refund-preview-logic";
import {
  canFulfill as calcCanFulfill,
  canShip as calcCanShip,
  canDeliver as calcCanDeliver,
  isPartiallyDelivered,
} from "@/lib/orders/fulfillment-logic";
import {
  calcReturnableItems,
  isDuplicateReturnLine,
  resolveShippingFeePayer,
  canRequestReturn,
  canReceiveReturn,
} from "@/lib/orders/return-logic";
import {
  calcExchangePreviewDiff,
  canRequestExchange,
  isValidExchangeAdditionalItem,
} from "@/lib/orders/exchange-logic";
import {
  canRequestClaim,
  validateClaimInput,
  resolveClaimOutcome,
} from "@/lib/orders/claim-logic";
import {
  orderStatusLabel,
  paymentStatusLabel,
  fulfillmentStatusLabel,
  maskPhone,
  maskEmail,
  type BadgeTone,
} from "@/lib/orders/status";
import { ordersToCsv, ALLOWED_ORDER_STATUSES } from "@/lib/orders/order-list-logic";
import { orderItemSubtotal, sortStateHistory, type StateEventDisplay } from "@/lib/orders/order-detail-logic";
import { canDeleteMemo, isValidMemoContent, parseCurrentActorId } from "@/lib/orders/memo-logic";
import { getToken } from "@/lib/api/client";
import { getUsers, type AdminUserRow } from "@/lib/api/rbac";

const PAGE_SIZE = 10;
// 세그탭(전체/결제완료/배송준비/배송중/배송완료/취소·환불) → 서버 검색 필터 매핑.
// 결제/배송상태는 코어 미지원 → /admin/orders-kr/search(searchOrders) 로 처리.
const TAB_FILTERS: Array<{ status?: string; payment_status?: string; fulfillment_status?: string }> = [
  {}, // 전체
  { payment_status: "captured" }, // 결제완료
  { fulfillment_status: "not_fulfilled" }, // 배송준비
  { fulfillment_status: "shipped" }, // 배송중
  { fulfillment_status: "delivered" }, // 배송완료
  { status: "canceled" }, // 취소/환불
];
const CARRIERS = ["CJ대한통운", "우체국택배", "한진택배", "롯데택배", "로젠택배"];

// 청약철회 사유(전자상거래법 §17 ② 분류) — code 는 백엔드 enum 과 1:1
const WITHDRAW_REASONS: { code: WithdrawalReasonCode; label: string }[] = [
  { code: "simple_change", label: "단순변심" },
  { code: "defect", label: "상품불량" },
  { code: "wrong_item", label: "오배송" },
  { code: "other", label: "기타" },
];
// 반품 정책 기본 배송비 부담주체 라벨
const PAYER_LABEL: Record<string, string> = {
  customer: "소비자 부담",
  seller: "사업자 부담",
  split: "분담",
};

type ActionKind = "cancel" | "fulfill" | "ship" | "deliver" | "refund" | "withdraw" | "return" | "receive_return" | "exchange" | "claim";

/** 마감 시각까지 남은 일수(D-N) 계산. 지났으면 음수. */
function ddayLabel(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(diff / 86_400_000);
  return days >= 0 ? `D-${days}` : `마감 ${-days}일 경과`;
}

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────

function formatKst(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
  } catch {
    return iso;
  }
}

function customerName(o: {
  customer?: { first_name?: string | null; last_name?: string | null } | null;
  email?: string | null;
}) {
  const n = [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(" ").trim();
  return n || o.email || "—";
}

function activeFulfillment(o: OrderDetail | null): OrderFulfillment | null {
  return (o?.fulfillments ?? []).find((f) => !f.canceled_at) ?? null;
}

function firstPayment(o: OrderDetail | null): OrderPayment | null {
  for (const pc of o?.payment_collections ?? []) {
    if (pc.payments && pc.payments.length) return pc.payments[0];
  }
  return null;
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={`badge ${tone}`}>
      <span className="bdot" />
      {label}
    </span>
  );
}

// ── Checkbox ─────────────────────────────────────────────────────────────────

function Ck({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      className={`ck${checked ? " on" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
    >
      <Check />
    </span>
  );
}

// ── KV (drawer 안 key-value 행) ───────────────────────────────────────────────

function Kv({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v]) => (
        <>
          <dt key={`k-${k}`}>{k}</dt>
          <dd key={`v-${k}`}>{v}</dd>
        </>
      ))}
    </dl>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 메인 페이지
// ════════════════════════════════════════════════════════════════════════════
export default function OrdersPage() {
  // ── 목록 상태 ──────────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState(0);
  const [sort, setSort] = useState("-display_id"); // 정렬 기본 주문번호 내림차순
  const [exportBusy, setExportBusy] = useState(false);

  // ── 현재 사용자(메모 삭제 권한 판단용) ─────────────────────────────────────
  const [currentActorId, setCurrentActorId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // ── 드로어 / 상세 상태 ──────────────────────────────────────────────────────
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [memos, setMemos] = useState<OrderMemo[]>([]);
  const [stateHistory, setStateHistory] = useState<StateEventDisplay[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [tracking, setTracking] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  // 환불 모달 — 환불 수단·계좌·멱등 nonce (t007)
  const [refundMethod, setRefundMethod] = useState<"pg" | "account">("pg");
  const [refundAccountBank, setRefundAccountBank] = useState("");
  const [refundAccountNumber, setRefundAccountNumber] = useState("");
  const [refundAccountHolder, setRefundAccountHolder] = useState("");
  const [refundNonce, setRefundNonce] = useState<string>("");
  // 강제취소 사유 select + nonce (t010 spec I1/I2)
  const [cancelReason, setCancelReason] = useState<"fraud" | "staff" | "inventory" | "other">("fraud");
  const [cancelNonce, setCancelNonce] = useState<string>("");
  const [confirm, setConfirm] = useState<null | { kind: ActionKind }>(null);
  const [busy, setBusy] = useState(false);
  // 청약철회·반품정책(RMA·legal-kr 모듈 wrap)
  const [withdrawal, setWithdrawal] = useState<WithdrawalStatus | null>(null);
  const [withdrawReason, setWithdrawReason] = useState<WithdrawalReasonCode>("simple_change");
  const [returnsPolicy, setReturnsPolicy] = useState<ReturnsPolicyRecord | null>(null);
  // 반품 접수 상태 (t004)
  const [_returnReasons, setReturnReasons] = useState<ReturnReason[]>([]);
  const [returnReason, setReturnReason] = useState<RmaReturnReason>("CUSTOMER_CHANGE_OF_MIND");
  const [returnItems, setReturnItems] = useState<{ id: string; quantity: number }[]>([]);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  // 교환 접수 상태 (t005)
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [exchangeReturnLines, setExchangeReturnLines] = useState<{ id: string; quantity: number; unit_price: number }[]>([]);
  const [exchangeAdditionalLines, setExchangeAdditionalLines] = useState<{ variant_id: string; quantity: number; unit_price: number }[]>([]);
  const [exchangeGroupMode, setExchangeGroupMode] = useState(false);
  const [exchangePickupTracking, setExchangePickupTracking] = useState("");
  // 클레임 접수 상태 (t006)
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimType, setClaimType] = useState<ClaimType>("replace");
  const [claimItems, setClaimItems] = useState<ClaimItem[]>([]);
  const [claimEvidence, setClaimEvidence] = useState("");
  const [claimReason, setClaimReason] = useState("");

  // ── 주문 수정(t008 — order-edits 코어 호출) ────────────────────────────────
  const [orderEditModalOpen, setOrderEditModalOpen] = useState(false);
  /** 라인별 수정 수량(키=라인 id, 값=변경 후 수량) */
  const [orderEditQty, setOrderEditQty] = useState<Record<string, number>>({});
  const [orderEditEmail, setOrderEditEmail] = useState("");
  const [orderEditAddr, setOrderEditAddr] = useState<Address>({});

  // ── 수기 주문 생성(t009 — draft-orders 코어 호출) ──────────────────────────
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [draftEmail, setDraftEmail] = useState("");
  const [draftRegionId, setDraftRegionId] = useState("");
  const [draftLines, setDraftLines] = useState<DraftOrderLineInput[]>([
    { variant_id: "", quantity: 1, unit_price: 0 },
  ]);
  const [draftAddr, setDraftAddr] = useState<{
    first_name: string;
    phone: string;
    address_1: string;
    city: string;
    postal_code: string;
  }>({ first_name: "", phone: "", address_1: "", city: "", postal_code: "" });

  // ── 목록 조회 ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tabF = TAB_FILTERS[activeTab] ?? {};
      const res = await searchOrders({
        q: q || undefined,
        // 탭이 주문상태(취소)를 지정하면 우선, 아니면 상태 select 값 사용
        status: tabF.status ?? (statusFilter || undefined),
        payment_status: tabF.payment_status,
        fulfillment_status: tabF.fulfillment_status,
        from: fromDate || undefined,
        to: toDate || undefined,
        order: sort,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      setOrders(res.orders);
      setCount(res.count);
    } catch (e) {
      setError((e as Error).message ?? "주문 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, fromDate, toDate, page, activeTab, sort]);

  /* ── 정렬 토글/표시 ── */
  function toggleSort(field: string) {
    setPage(1);
    setSort((s) => (s === `-${field}` ? field : `-${field}`));
  }
  function sortCaret(field: string): string {
    return sort === field ? "▲" : sort === `-${field}` ? "▼" : "↕";
  }

  useEffect(() => {
    void load();
  }, [load]);

  // ── 현재 사용자 정보 초기화(메모 삭제 권한 판단) ─────────────────────────────
  useEffect(() => {
    const actorId = parseCurrentActorId(getToken());
    setCurrentActorId(actorId);
    if (actorId) {
      // RBAC 사용자 목록에서 현재 사용자 role 조회(실패 시 무시)
      getUsers()
        .then(({ users }) => {
          const me = (users as AdminUserRow[]).find((u) => u.id === actorId);
          setCurrentUserRole(me?.role_key ?? null);
        })
        .catch(() => setCurrentUserRole(null));
    }
  }, []);

  // ── 선택 ──────────────────────────────────────────────────────────────────
  const allSelected = orders.length > 0 && selected.size === orders.length;
  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ── 상세 열기 ─────────────────────────────────────────────────────────────
  async function openDetail(o: OrderListItem) {
    setDetail(null);
    setMemos([]);
    setStateHistory([]);
    setMemoDraft("");
    setTracking("");
    setRefundAmount("");
    setRefundMethod("pg");
    setRefundAccountBank("");
    setRefundAccountNumber("");
    setRefundAccountHolder("");
    setRefundNonce("");
    setCancelReason("fraud");
    setCancelNonce("");
    setWithdrawal(null);
    setWithdrawReason("simple_change");
    setReturnsPolicy(null);
    setReturnItems([]);
    setReturnModalOpen(false);
    setExchangeModalOpen(false);
    setExchangeReturnLines([]);
    setExchangeAdditionalLines([{ variant_id: "", quantity: 1, unit_price: 0 }]);
    setExchangeGroupMode(false);
    setExchangePickupTracking("");
    setClaimModalOpen(false);
    setClaimType("replace");
    setClaimItems([]);
    setClaimEvidence("");
    setClaimReason("");
    setDetailLoading(true);
    try {
      const [d, m] = await Promise.all([getOrder(o.id), listMemos(o.id)]);
      setDetail(d.order);
      setMemos(m.memos);
      // 상태 전이 이력 = guard(BE 워커 신설 중 — 실패해도 본문 정상 렌더)
      void getOrderHistory(o.id)
        .then((r) => setStateHistory(sortStateHistory(r.state_history)))
        .catch(() => setStateHistory([]));
      // 청약철회·반품정책 = 개별 guard(모듈 실패해도 본문 정상 렌더)
      void getWithdrawal(o.id).then(setWithdrawal).catch(() => setWithdrawal(null));
      void getReturnsPolicy()
        .then((r) => setReturnsPolicy(r.policy))
        .catch(() => setReturnsPolicy(null));
      void listReturnReasons()
        .then((r) => setReturnReasons(r.return_reasons))
        .catch(() => setReturnReasons([]));
    } catch (e) {
      setError(`주문 상세 조회 실패: ${(e as Error).message}`);
    } finally {
      setDetailLoading(false);
    }
  }

  // ── 메모 저장 ─────────────────────────────────────────────────────────────
  async function saveMemo() {
    if (!detail) return;
    // isValidMemoContent: 1~2000자 검증(§V0-2 production 호출)
    if (!isValidMemoContent(memoDraft)) {
      setError("메모 내용을 1~2000자로 입력해 주세요.");
      return;
    }
    try {
      const { memo } = await addMemo(detail.id, memoDraft);
      setMemos((prev) => [memo, ...prev]);
      setMemoDraft("");
    } catch (e) {
      setError(`메모 저장 실패: ${(e as Error).message}`);
    }
  }

  // ── 메모 삭제 ─────────────────────────────────────────────────────────────
  async function removeMemo(nid: string) {
    if (!detail) return;
    try {
      await deleteMemo(detail.id, nid);
      setMemos((prev) => prev.filter((m) => m.id !== nid));
    } catch (e) {
      setError(`메모 삭제 실패: ${(e as Error).message}`);
    }
  }

  // ── 상세 갱신 ─────────────────────────────────────────────────────────────
  async function reloadDetail(id: string) {
    const [d, m] = await Promise.all([getOrder(id), listMemos(id)]);
    setDetail(d.order);
    setMemos(m.memos);
    void getOrderHistory(id)
      .then((r) => setStateHistory(sortStateHistory(r.state_history)))
      .catch(() => setStateHistory([]));
    void getWithdrawal(id).then(setWithdrawal).catch(() => setWithdrawal(null));
  }

  // ── 액션 실행 ─────────────────────────────────────────────────────────────
  async function runConfirm() {
    if (!detail || !confirm) return;
    const o = detail;
    const kind = confirm.kind;
    setConfirm(null);
    setBusy(true);
    try {
      const items = (o.items ?? []).map((it) => ({ id: it.id, quantity: it.quantity }));
      if (kind === "cancel") {
        // validateCancelReason 은 백엔드 route 에서도 수행 — 프론트에서 enum 선택 강제로 이미 보장됨
        const nonce = cancelNonce || crypto.randomUUID();
        await forceCancel(o.id, cancelReason, nonce);
        // 다음 취소 제출은 새 nonce 로 (재제출 중복 방지)
        setCancelNonce(crypto.randomUUID());
      } else if (kind === "fulfill") {
        await createFulfillment(o.id, items);
      } else if (kind === "ship") {
        const ful = activeFulfillment(o);
        if (!ful) throw new Error("출고된 항목이 없습니다. 먼저 출고 처리하세요.");
        if (!tracking.trim()) throw new Error("송장번호를 입력하세요.");
        await createShipment(o.id, ful.id, items, carrier, tracking.trim());
        setTracking("");
      } else if (kind === "deliver") {
        const ful = activeFulfillment(o);
        if (!ful) throw new Error("출고된 항목이 없습니다.");
        await markDelivered(o.id, ful.id);
      } else if (kind === "refund") {
        const pay = firstPayment(o);
        if (!pay) throw new Error("결제 정보가 없습니다.");
        const amt = Number(refundAmount || o.total);
        if (!Number.isFinite(amt) || amt <= 0) throw new Error("환불 금액을 확인하세요.");
        if (!pay.captured_at) await capturePayment(pay.id);

        // ── 코어 PG 캡처 후 커스텀 route 호출 (t007 spec §6 API1) ─────────
        // nonce: 모달 최초 오픈 시 생성된 값 사용 (같은 제출 = 같은 nonce → 멱등, 재제출 시 새 nonce)
        const nonce = refundNonce || crypto.randomUUID();
        const isFullRefund = !refundAmount || Number(refundAmount) >= o.total;
        const payload: RefundOrderPayload = isFullRefund
          ? {
              // 전액환불: amount 사용
              amount: o.total,
              nonce,
              refund_method: refundMethod,
              account_info:
                refundMethod === "account"
                  ? {
                      bank: refundAccountBank,
                      account_number: refundAccountNumber,
                      holder: refundAccountHolder,
                    }
                  : null,
              reason: "전액환불",
            }
          : {
              // 부분환불: items + 비례배분 필드 포함
              items: (o.items ?? []).map((it) => ({
                id: it.id,
                amount: Math.floor((it.total * amt) / o.total),
              })),
              total_line_amount: o.item_subtotal ?? o.subtotal ?? o.total,
              coupon_discount: 0,
              point_discount: 0,
              shipping_fee: o.shipping_total ?? 0,
              nonce,
              refund_method: refundMethod,
              account_info:
                refundMethod === "account"
                  ? {
                      bank: refundAccountBank,
                      account_number: refundAccountNumber,
                      holder: refundAccountHolder,
                    }
                  : null,
              reason: "부분환불",
            };

        // 코어 refundPayment 는 이미 capturePayment 호출 후 처리됨(위 라인 유지)
        await refundPayment(pay.id, amt);
        // 커스텀 route — 멱등키·비례배분·환불수단·정산 차감 처리
        await refundOrder(o.id, payload);

        // 다음 환불 제출은 새 nonce 로 (재제출 중복 방지)
        setRefundNonce(crypto.randomUUID());
        setRefundAmount("");
      } else if (kind === "withdraw") {
        await claimWithdrawal(o.id, withdrawReason);
      } else if (kind === "return") {
        // 반품 접수 전 클라이언트 중복 라인 가드
        const returnableItems = calcReturnableItems(o.items ?? []);
        const activeLines = returnableItems
          .filter((it) => it.maxQuantity === 0)
          .map((it) => ({ item_id: it.id, quantity: 0 }));
        if (isDuplicateReturnLine(returnItems.map((i) => i.id), activeLines)) {
          throw new Error("이미 반품 중인 라인이 포함되어 있습니다.");
        }
        const rmaReason = returnReason;
        const returnApiItems: ReturnItem[] = returnItems.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          reason_id: undefined,
          note: rmaReason,
        }));
        await createReturn(o.id, returnApiItems);
        setReturnModalOpen(false);
      } else if (kind === "receive_return") {
        // 수령 처리 — detail 에 return 정보가 있다면 사용 (단순화: 첫번째 requested return)
        const returnRecord = (o as OrderDetail & { returns?: { id: string; status: string; items?: { id: string; quantity: number }[] }[] }).returns?.find(
          (r) => r.status === "requested" || r.status === "partially_received"
        );
        if (!returnRecord) throw new Error("수령 처리할 반품 접수 건이 없습니다.");
        const receiveItems = (returnRecord.items ?? []).map((i) => ({ id: i.id, quantity: i.quantity }));
        await receiveReturn(returnRecord.id, receiveItems);
      } else if (kind === "exchange") {
        // 교환 생성 (t005 — createExchange + groupExchanges)
        const rtnItems: ExchangeReturnItem[] = exchangeReturnLines.map((l) => ({
          id: l.id,
          quantity: l.quantity,
        }));
        const addItems: ExchangeAdditionalItem[] = exchangeAdditionalLines
          .filter((l) => isValidExchangeAdditionalItem(l))
          .map((l) => ({
            variant_id: l.variant_id,
            quantity: l.quantity,
            unit_price: l.unit_price,
          }));
        if (rtnItems.length === 0) throw new Error("회수 라인을 선택하세요.");
        if (addItems.length === 0) throw new Error("신규 변형을 올바르게 입력하세요.");
        // 단건 교환 생성 — createExchange (dead code 해소)
        const { exchange } = await createExchange(o.id, rtnItems, addItems) as { exchange: { id?: string }; price_diff: unknown };
        // 다건 그룹 묶기 옵션 선택 시 — groupExchanges (dead code 해소)
        if (exchangeGroupMode && exchange && typeof (exchange as { id?: string }).id === "string") {
          await groupExchanges(
            o.id,
            [(exchange as { id: string }).id],
            exchangePickupTracking.trim() || undefined
          );
        }
        setExchangeModalOpen(false);
        setExchangeReturnLines([]);
        setExchangeAdditionalLines([{ variant_id: "", quantity: 1, unit_price: 0 }]);
        setExchangeGroupMode(false);
        setExchangePickupTracking("");
      } else if (kind === "claim") {
        // 클레임 접수 — claim-logic.ts validateClaimInput 호출 후 코어 createClaim 직접 호출
        const validation = validateClaimInput({
          type: claimType,
          items: claimItems,
          evidence: claimEvidence || undefined,
        });
        if (!validation.valid) {
          throw new Error(validation.reason ?? "클레임 입력값을 확인하세요.");
        }
        await createClaim(o.id, claimType, claimItems, claimEvidence || undefined);
        setClaimModalOpen(false);
        setClaimItems([]);
        setClaimEvidence("");
        setClaimReason("");
      }
      await load();
      await reloadDetail(o.id);
    } catch (e) {
      setError(`처리 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // ── 주문 수정 제출(t008 — order-edits 코어 워크플로우: 생성→항목변경→확정) ──
  async function submitOrderEdit() {
    if (!detail) return;
    const o = detail;
    setBusy(true);
    try {
      // 라인 수량 변경 추출(order-edit-logic 순수함수 호출)
      const edits: OrderLineQuantityEdit[] = (o.items ?? []).map((it) => ({
        id: it.id,
        currentQuantity: it.quantity,
        nextQuantity: orderEditQty[it.id] ?? it.quantity,
        unitPrice: it.unit_price,
      }));
      const changes = buildItemQuantityChanges(edits);

      // 이메일/주소 입력 검증(선택 입력)
      const emailCheck = validateOrderEditEmail(orderEditEmail);
      if (!emailCheck.valid) throw new Error(emailCheck.reason ?? "이메일 형식 오류");
      const addrCheck = validateShippingAddressInput(orderEditAddr);
      if (!addrCheck.valid) throw new Error(addrCheck.reason ?? "배송지 입력 오류");

      const emailFilled = orderEditEmail.trim() !== "";
      const addrFilled = Object.values(orderEditAddr).some(
        (v) => (v ?? "").toString().trim() !== ""
      );
      if (changes.length === 0 && !emailFilled && !addrFilled) {
        throw new Error("변경할 내용이 없습니다.");
      }

      // 1) 라인 변경 — OrderChange 생성 → 항목 수량변경 → confirm(version++ + summary 재계산)
      //    order-edits API 의 path id 는 모두 order_id(코어 계약). 중간 단계 실패 시
      //    활성 change 잔존 방지를 위해 롤백(cancelOrderEdit) — §V0 재발방지.
      if (changes.length > 0) {
        await createOrderEdit(o.id);
        try {
          for (const c of changes) {
            await updateOrderEditItem(o.id, c.id, c.quantity);
          }
          await confirmOrderEdit(o.id);
        } catch (inner) {
          // 활성 order_change 가 남으면 다음 수정이 막히므로 반드시 정리(order_id 로 취소)
          try {
            await cancelOrderEdit(o.id);
          } catch {
            // 정리 실패는 무시(원 오류를 노출)
          }
          throw inner;
        }
      }
      // 2) 이메일 수정(코어 POST /admin/orders/:id)
      if (emailFilled) {
        await updateOrderEmail(o.id, orderEditEmail.trim());
      }
      // 3) 배송지 수정(코어 POST /admin/orders/:id)
      if (addrFilled) {
        await updateOrderShippingAddress(o.id, orderEditAddr);
      }

      setOrderEditModalOpen(false);
      setOrderEditQty({});
      setOrderEditEmail("");
      setOrderEditAddr({});
      await load();
      await reloadDetail(o.id);
    } catch (e) {
      setError(`주문 수정 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // ── 수기 주문 생성 제출(t009 — draft 생성 → 정식 주문 전환) ─────────────────
  async function submitDraftOrder() {
    setBusy(true);
    try {
      const items: DraftOrderLineInput[] = draftLines
        .filter((l) => l.variant_id.trim() !== "")
        .map((l) => ({
          variant_id: l.variant_id.trim(),
          quantity: l.quantity,
          unit_price: l.unit_price,
        }));
      // draft-order-logic 순수함수로 입력 검증
      const check = validateDraftOrderInput({
        email: draftEmail.trim(),
        region_id: draftRegionId,
        items,
        shipping_address: {
          first_name: draftAddr.first_name,
          address_1: draftAddr.address_1,
          city: draftAddr.city,
        },
      });
      if (!check.valid) throw new Error(check.reason ?? "입력값을 확인하세요.");

      // 1) draft 생성(is_draft_order=true)
      const { draft_order } = await createDraftOrder({
        email: draftEmail.trim(),
        region_id: draftRegionId,
        items: items as DraftOrderItemInput[],
        shipping_address: {
          first_name: draftAddr.first_name,
          phone: draftAddr.phone,
          address_1: draftAddr.address_1,
          city: draftAddr.city,
          postal_code: draftAddr.postal_code,
        },
      });
      // 2) 정식 주문 전환(convert-to-order)
      await convertDraftOrder(draft_order.id);

      setDraftModalOpen(false);
      setDraftEmail("");
      setDraftRegionId("");
      setDraftLines([{ variant_id: "", quantity: 1, unit_price: 0 }]);
      setDraftAddr({ first_name: "", phone: "", address_1: "", city: "", postal_code: "" });
      await load();
    } catch (e) {
      setError(`수기 주문 생성 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // ── 페이지네이션 ───────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, count);

  // ── 드로어 내 파생값 (순수로직 함수 호출) ────────────────────────────────
  const ful = activeFulfillment(detail);
  // fulfillment-logic.ts 의 순수함수 호출 (인라인 → 함수 호출로 교체)
  const canFulfill = detail ? calcCanFulfill(detail) : false;
  const canShip = detail ? calcCanShip(ful, detail) : false;
  const canDeliver = calcCanDeliver(ful);
  const pay = firstPayment(detail);
  const canRefund = !!pay && detail?.status !== "canceled";
  // 주문 수정 가능 여부(t008 — 발송 전만, order-edit-logic 순수함수)
  const canEdit = detail ? canEditOrder(detail) : false;
  // 주문 수정 차액 미리보기(calcOrderEditDiff 실제 호출 — §V0-2 dead code 금지)
  const orderEditDiff = (() => {
    if (!detail || !orderEditModalOpen) return null;
    try {
      const edits: OrderLineQuantityEdit[] = (detail.items ?? []).map((it) => ({
        id: it.id,
        currentQuantity: it.quantity,
        nextQuantity: orderEditQty[it.id] ?? it.quantity,
        unitPrice: it.unit_price,
      }));
      return calcOrderEditDiff(edits);
    } catch {
      return null;
    }
  })();
  // 수기 주문 합계 미리보기(calcDraftOrderTotal 실제 호출 — §V0-2 dead code 금지)
  const draftTotal = (() => {
    const items = draftLines.filter((l) => l.variant_id.trim() !== "");
    if (items.length === 0) return 0;
    try {
      return calcDraftOrderTotal(items);
    } catch {
      return 0;
    }
  })();

  // 환불 미리보기 — refund-preview-logic.ts 실제 호출 (page.tsx 가 함수를 소비, §V0-2 dead code 금지)
  // refundAmount 또는 detail 이 변경될 때마다 실시간 재산출
  const computedRefundPreview: RefundPreviewResult | null = (() => {
    if (!detail || !canRefund) return null;
    try {
      const totalLineAmt = detail.item_subtotal ?? detail.subtotal ?? detail.total;
      const isFullRefund = !refundAmount || Number(refundAmount) >= detail.total;
      if (isFullRefund) {
        // 전액환불 — 라인 전체
        return calcRefundPreview({
          lines: (detail.items ?? []).map((it) => ({ id: it.id, amount: it.total })),
          couponDiscount: 0,
          pointDiscount: 0,
          shippingFee: detail.shipping_total ?? 0,
          totalLineAmount: totalLineAmt > 0 ? totalLineAmt : detail.total,
        });
      } else {
        // 부분환불 — 입력 금액을 라인 비례로 배분
        const amt = Number(refundAmount);
        return calcRefundPreview({
          lines: (detail.items ?? []).map((it) => ({
            id: it.id,
            amount: Math.floor((it.total * amt) / detail.total),
          })),
          couponDiscount: 0,
          pointDiscount: 0,
          shippingFee: detail.shipping_total ?? 0,
          totalLineAmount: totalLineAmt > 0 ? totalLineAmt : detail.total,
        });
      }
    } catch {
      return null;
    }
  })();

  // 재청구 배송비 미리보기 (calcReshippingPreview 실제 호출 — §V0-2 dead code 금지)
  const computedReshippingFee: number = (() => {
    if (!detail || !computedRefundPreview) return 0;
    const remaining = detail.total - computedRefundPreview.totalRefund;
    try {
      return calcReshippingPreview({ remainingOrderAmount: Math.max(0, remaining) })
        .reshippingFee;
    } catch {
      return 0;
    }
  })();

  // 반품 접수 가능 여부 (return-logic.ts 함수 호출)
  const canReturn = detail ? canRequestReturn(detail.fulfillment_status, detail.status) : false;
  // 교환 접수 가능 여부 (exchange-logic.ts 함수 호출)
  const canExchange = detail ? canRequestExchange(detail.fulfillment_status, detail.status) : false;
  // 클레임 접수 가능 여부 (claim-logic.ts canRequestClaim 호출 — spec §3 S1: delivered 이후만)
  const canClaim = detail ? canRequestClaim(detail.fulfillment_status, detail.status) : false;
  // 클레임 후속 안내 (claim-logic.ts resolveClaimOutcome 호출 — spec §3 S2/S3)
  const claimOutcome = resolveClaimOutcome(claimType);
  // 교환 차액 미리보기 (exchange-logic.ts 함수 호출 — 모달 내 실시간 표시)
  const exchangePreviewDiff = calcExchangePreviewDiff(
    exchangeReturnLines.filter((l) => l.id && l.quantity > 0),
    exchangeAdditionalLines.filter((l) => isValidExchangeAdditionalItem(l))
  );
  // 부분배송 여부 (fulfillment-logic.ts)
  const isPartial = detail ? isPartiallyDelivered(detail.fulfillment_status) : false;

  const confirmTitle: Record<ActionKind, string> = {
    cancel: "주문을 취소하시겠습니까?",
    fulfill: "출고 처리하시겠습니까?",
    ship: "송장을 등록하시겠습니까?",
    deliver: "배송 완료로 강제 변경하시겠습니까?",
    refund: "환불 처리하시겠습니까?",
    withdraw: "청약철회를 접수하시겠습니까?",
    return: "반품을 접수하시겠습니까?",
    receive_return: "반품 수령 처리하시겠습니까?",
    exchange: "교환을 생성하시겠습니까?",
    claim: "클레임을 접수하시겠습니까?",
  };
  const confirmMsg: Record<ActionKind, string> = {
    cancel: "주문을 취소 처리합니다.",
    fulfill: "미출고 품목 전체에 대해 출고(fulfillment)를 생성합니다.",
    ship: "출고 항목을 발송 처리하고 운송장을 등록합니다.",
    deliver: "송장 추적과 무관하게 배송 상태를 완료로 변경합니다.",
    refund: "고객 결제 금액을 환불하고 결제를 취소합니다.",
    withdraw: "전자상거래법 §17 청약철회를 접수합니다. 환불 마감은 영업일 3일(§18 ①)입니다.",
    return: "선택한 상품에 대한 반품을 접수합니다. 반품 상태가 requested 로 변경됩니다.",
    receive_return: "반품 물품을 수령 처리합니다. 반품 상태가 received 로 변경됩니다.",
    exchange: "회수 라인과 신규 변형을 교환 처리합니다. 교환 상태가 exchanging 으로 변경됩니다.",
    claim: "선택한 항목에 대해 클레임(보상)을 접수합니다. 코어 /admin/claims 에 직접 등록됩니다.",
  };
  const confirmText: Record<ActionKind, string> = {
    cancel: "주문 취소",
    fulfill: "출고 처리",
    ship: "송장 등록",
    deliver: "배송 완료 처리",
    refund: "환불 처리",
    withdraw: "청약철회 접수",
    return: "반품 접수",
    receive_return: "수령 처리",
    exchange: "교환 생성",
    claim: "클레임 접수",
  };

  // ── 탭 데이터 (prototype DATA.orderTabs 구조 반영) ────────────────────────
  const tabs = [
    { label: "전체", cnt: count },
    { label: "결제완료", cnt: null },
    { label: "배송준비", cnt: null },
    { label: "배송중", cnt: null },
    { label: "배송완료", cnt: null },
    { label: "취소/환불", cnt: null },
  ];

  return (
    <div className="scr">
      {/* ① 페이지 헤더 */}
      <div className="page-header">
        <div className="ph-l">
          <h1>주문 관리</h1>
          <div className="ph-sub">
            전체 {count.toLocaleString("ko-KR")}건 · 처리 대기{" "}
            {orders.filter((o) => o.fulfillment_status === "not_fulfilled" && o.status !== "canceled").length}건
          </div>
        </div>
        <div className="ph-actions">
          <button
            className="btn"
            type="button"
            disabled={exportBusy}
            onClick={async () => {
              if (exportBusy) return;
              setExportBusy(true);
              try {
                // 현재 필터 기준 전체 조회(최대 1000건) → CSV 다운로드
                const res = await listOrders({
                  q: q || undefined,
                  status: statusFilter || undefined,
                  from: fromDate || undefined,
                  to: toDate || undefined,
                  limit: 1000,
                  offset: 0,
                });
                const csv = ordersToCsv(res.orders);
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                setError(`CSV 다운로드 실패: ${(e as Error).message}`);
              } finally {
                setExportBusy(false);
              }
            }}
          >
            <Download size={16} />
            <span>{exportBusy ? "다운로드 중…" : "엑셀 다운로드"}</span>
          </button>
          {/* 수기 주문 생성 진입(t009 — 전화/CS 주문) */}
          <button
            className="btn"
            type="button"
            onClick={async () => {
              try {
                if (regions.length === 0) {
                  const r = await listRegions();
                  setRegions(r.regions);
                  if (r.regions[0]) setDraftRegionId(r.regions[0].id);
                }
              } catch {
                // 리전 로드 실패 시 모달 안에서 안내(빈 select)
              }
              setDraftModalOpen(true);
            }}
          >
            <span>수기 주문 생성</span>
          </button>
          <button className="btn primary" type="button">
            <Truck size={16} />
            <span>일괄 송장 등록</span>
          </button>
        </div>
      </div>

      {/* 수기 주문 생성 모달 (t009 — draft-orders 코어: 생성 → 정식 주문 전환) */}
      {draftModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => setDraftModalOpen(false)}
        >
          <div
            className="card"
            style={{ background: "var(--bg)", borderRadius: 12, padding: 20, width: 560, maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dsec-t" style={{ marginBottom: 12 }}>수기 주문 생성</div>
            {/* 고객 이메일 */}
            <div className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="field-l" style={{ minWidth: 80 }}>고객 이메일</span>
              <input className="inp" type="text" style={{ flex: 1 }} placeholder="buyer@example.com"
                value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} />
            </div>
            {/* 리전 */}
            <div className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span className="field-l" style={{ minWidth: 80 }}>리전</span>
              <select className="inp select-like" style={{ flex: 1 }}
                value={draftRegionId} onChange={(e) => setDraftRegionId(e.target.value)}>
                {regions.length === 0 ? <option value="">리전 없음</option> : null}
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} ({r.currency_code})</option>
                ))}
              </select>
            </div>
            {/* 상품 라인 */}
            <div style={{ marginBottom: 12 }}>
              <div className="field-l" style={{ marginBottom: 6 }}>상품 라인 (variant id · 수량 · 단가)</div>
              {draftLines.map((l, i) => (
                <div key={i} className="frow" style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <input className="inp" type="text" style={{ flex: 2 }} placeholder="variant_..."
                    value={l.variant_id}
                    onChange={(e) => setDraftLines((prev) => prev.map((x, j) => j === i ? { ...x, variant_id: e.target.value } : x))} />
                  <input className="inp" type="number" style={{ width: 64 }} min={1} value={l.quantity}
                    onChange={(e) => setDraftLines((prev) => prev.map((x, j) => j === i ? { ...x, quantity: Math.max(1, Number(e.target.value)) } : x))} />
                  <input className="inp" type="number" style={{ width: 96 }} min={0} value={l.unit_price}
                    onChange={(e) => setDraftLines((prev) => prev.map((x, j) => j === i ? { ...x, unit_price: Math.max(0, Number(e.target.value)) } : x))} />
                  {draftLines.length > 1 ? (
                    <button className="btn" type="button"
                      onClick={() => setDraftLines((prev) => prev.filter((_, j) => j !== i))}>－</button>
                  ) : null}
                </div>
              ))}
              <button className="btn" type="button"
                onClick={() => setDraftLines((prev) => [...prev, { variant_id: "", quantity: 1, unit_price: 0 }])}>
                ＋ 라인 추가
              </button>
            </div>
            {/* 배송지 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input className="inp" type="text" placeholder="수취인명" value={draftAddr.first_name}
                onChange={(e) => setDraftAddr((p) => ({ ...p, first_name: e.target.value }))} />
              <input className="inp" type="text" placeholder="연락처" value={draftAddr.phone}
                onChange={(e) => setDraftAddr((p) => ({ ...p, phone: e.target.value }))} />
              <input className="inp" type="text" placeholder="주소" style={{ gridColumn: "1 / 3" }} value={draftAddr.address_1}
                onChange={(e) => setDraftAddr((p) => ({ ...p, address_1: e.target.value }))} />
              <input className="inp" type="text" placeholder="도시" value={draftAddr.city}
                onChange={(e) => setDraftAddr((p) => ({ ...p, city: e.target.value }))} />
              <input className="inp" type="text" placeholder="우편번호" value={draftAddr.postal_code}
                onChange={(e) => setDraftAddr((p) => ({ ...p, postal_code: e.target.value }))} />
            </div>
            {/* 합계 미리보기 */}
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              합계 미리보기: <b>{formatCurrency(draftTotal, regions.find((r) => r.id === draftRegionId)?.currency_code ?? "KRW")}</b>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" type="button" disabled={busy}
                onClick={() => void submitDraftOrder()}>
                생성 후 주문 전환
              </button>
              <button className="btn" type="button" onClick={() => setDraftModalOpen(false)}>취소</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ② 필터바 */}
      <div className="filterbar">
        <label className="search-input">
          <Search size={15} />
          <input
            type="text"
            placeholder="주문번호 · 고객명 검색"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </label>
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="주문 상태 필터"
        >
          <option value="">주문상태: 전체</option>
          {ALLOWED_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          className="select"
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
          }}
          aria-label="기간 시작"
          style={{ minWidth: 120 }}
        />
        <span style={{ fontSize: 12, color: "var(--text-3)", alignSelf: "center" }}>~</span>
        <input
          className="select"
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
          aria-label="기간 종료"
          style={{ minWidth: 120 }}
        />
        <span className="spacer" />
        <button
          className="btn ghost"
          type="button"
          onClick={() => {
            setQ("");
            setStatusFilter("");
            setFromDate("");
            setToDate("");
            setPage(1);
          }}
        >
          초기화
        </button>
        <button className="btn primary" type="button" onClick={() => void load()}>
          조회
        </button>
      </div>

      {/* ③ 카드 — segtabs + 테이블 */}
      <div className="card mb16">
        {/* segtabs */}
        <div className="segtabs">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              type="button"
              className={`segtab${activeTab === i ? " active" : ""}`}
              onClick={() => { setActiveTab(i); setPage(1); }}
            >
              {t.label}
              {t.cnt !== null ? (
                <span className="cnt">{t.cnt.toLocaleString("ko-KR")}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* 테이블 */}
        <div className="table-wrap">
          {error ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--danger)", fontSize: 13 }}>
              {error}
            </div>
          ) : loading ? (
            <div style={{ padding: "32px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              불러오는 중…
            </div>
          ) : (
            <table className="dt">
              <thead>
                <tr>
                  {/* 체크박스 헤더 */}
                  <th className="col-check">
                    <Ck checked={allSelected} onChange={toggleAll} />
                  </th>
                  <th className="sortable" style={{ minWidth: 90, cursor: "pointer" }} onClick={() => toggleSort("display_id")}>
                    주문번호 <span className="sortcaret">{sortCaret("display_id")}</span>
                  </th>
                  <th className="sortable" style={{ minWidth: 140, cursor: "pointer" }} onClick={() => toggleSort("created_at")}>
                    주문일시 <span className="sortcaret">{sortCaret("created_at")}</span>
                  </th>
                  <th style={{ minWidth: 100 }}>고객명</th>
                  <th className="num" style={{ minWidth: 60 }}>수량</th>
                  <th className="num sortable" style={{ minWidth: 110, cursor: "pointer" }} onClick={() => toggleSort("total")}>
                    결제금액 <span className="sortcaret">{sortCaret("total")}</span>
                  </th>
                  <th style={{ minWidth: 90 }}>결제상태</th>
                  <th style={{ minWidth: 90 }}>주문상태</th>
                  <th style={{ minWidth: 90 }}>배송상태</th>
                  <th style={{ minWidth: 110 }}>송장</th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-3)" }}>
                      주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const pay = paymentStatusLabel(o.payment_status);
                    const ord = orderStatusLabel(o.status);
                    const ship = fulfillmentStatusLabel(o.fulfillment_status);
                    const ful0 = (o as OrderListItem & { fulfillments?: { labels?: { tracking_number: string | null }[]; shipped_at?: string | null }[] }).fulfillments;
                    const tracking0 = ful0?.[0]?.labels?.[0]?.tracking_number ?? null;
                    const hasInv = !!tracking0;
                    const isReady = o.fulfillment_status === "not_fulfilled" && o.status !== "canceled";
                    const qty = (o.items ?? []).reduce((s, i) => s + i.quantity, 0);

                    return (
                      <tr key={o.id} onClick={() => void openDetail(o)}>
                        <td className="col-check">
                          <Ck checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} />
                        </td>
                        <td className="strong">#{o.display_id}</td>
                        <td className="muted tnum">{formatKst(o.created_at).slice(5)}</td>
                        <td>{customerName(o)}</td>
                        <td className="num muted">{qty}</td>
                        <td className="num strong">{formatCurrency(o.total, o.currency_code)}</td>
                        <td><Badge label={pay.label} tone={pay.tone} /></td>
                        <td><Badge label={ord.label} tone={ord.tone} /></td>
                        <td>
                          {o.fulfillment_status === "not_fulfilled" ? (
                            <span className="muted">—</span>
                          ) : (
                            <Badge label={ship.label} tone={ship.tone} />
                          )}
                        </td>
                        <td className="muted tnum">
                          {hasInv ? (
                            tracking0
                          ) : isReady ? (
                            <span className="no-invoice">
                              <span className="ni-dot" />
                              미등록
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span
                            className="kebab"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal size={16} />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ④ tablefoot + pagination */}
        <div className="tablefoot">
          <span className="tf-info">
            {count > 0
              ? `${pageStart.toLocaleString("ko-KR")}–${pageEnd.toLocaleString("ko-KR")} / ${count.toLocaleString("ko-KR")}건`
              : "0건"}
          </span>
          <span className="spacer" />
          {totalPages > 1 ? (
            <div className="pager">
              <button
                className={`pg${page <= 1 ? " dis" : ""}`}
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    className={`pg${page === p ? " active" : ""}`}
                    type="button"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                className={`pg${page >= totalPages ? " dis" : ""}`}
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ⑤ 주문 상세 드로어 — prototype DRAWERS.order 1:1 이식 */}
      <DetailDrawer
        open={!!detail || detailLoading}
        wide
        title={detail ? `주문 #${detail.display_id}` : "주문 상세"}
        sub={detail ? `${formatKst(detail.created_at)} · ${customerName(detail)}` : undefined}
        status={
          detail ? (
            <Badge {...orderStatusLabel(detail.status)} />
          ) : undefined
        }
        onClose={() => {
          setDetail(null);
          setDetailLoading(false);
        }}
        footer={
          detail ? (
            <div className="detail-f" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* 위험 액션 — prototype: danger-zone */}
              <div className="danger-zone">
                <button
                  className="btn danger"
                  type="button"
                  disabled={detail.status === "canceled" || busy}
                  onClick={() => {
                    // 모달 최초 오픈마다 새 nonce 발급 (spec I2 — 같은 제출 = 같은 nonce)
                    setRefundNonce(crypto.randomUUID());
                    setConfirm({ kind: "refund" });
                  }}
                >
                  환불 처리
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={detail.status === "canceled" || busy}
                  onClick={() => {
                    // 모달 최초 오픈마다 새 nonce 발급 (spec I2 — 같은 제출 = 같은 nonce)
                    setCancelReason("fraud");
                    setCancelNonce(crypto.randomUUID());
                    setConfirm({ kind: "cancel" });
                  }}
                >
                  주문 취소
                </button>
              </div>
              <span className="spacer" />
              {canDeliver ? (
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm({ kind: "deliver" })}
                >
                  배송 완료 처리
                </button>
              ) : null}
              {/* 반품 접수 버튼 (t004 — delivered 이후만 활성) */}
              {canReturn ? (
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => setReturnModalOpen(true)}
                >
                  반품 접수
                </button>
              ) : null}
              {/* 반품 수령 처리 버튼 (t004 — receiveReturn) */}
              {(detail as OrderDetail & { returns?: { id: string; status: string }[] }).returns?.some(
                (r) => canReceiveReturn(r.status)
              ) ? (
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirm({ kind: "receive_return" })}
                >
                  반품 수령 처리
                </button>
              ) : null}
              {/* 교환 생성 버튼 (t005 — delivered 이후만 활성, spec §3 S1) */}
              {canExchange ? (
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    // 교환 모달 열기 전 회수 라인 초기화(체크 없음)
                    setExchangeReturnLines([]);
                    setExchangeAdditionalLines([{ variant_id: "", quantity: 1, unit_price: 0 }]);
                    setExchangeGroupMode(false);
                    setExchangePickupTracking("");
                    setExchangeModalOpen(true);
                  }}
                >
                  교환 생성
                </button>
              ) : null}
              {/* 클레임 접수 버튼 (t006 — delivered 이후만 활성, spec §3 S1) */}
              {canClaim ? (
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    // 클레임 모달 열기 전 상태 초기화
                    setClaimType("replace");
                    setClaimItems([]);
                    setClaimEvidence("");
                    setClaimReason("");
                    setClaimModalOpen(true);
                  }}
                >
                  클레임 접수
                </button>
              ) : null}
              {/* 주문 수정 버튼 (t008 — 발송 전만 활성, spec §3 S1) */}
              {canEdit ? (
                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    // 모달 열기 전 라인 수량을 현재 값으로 초기화
                    const init: Record<string, number> = {};
                    (detail.items ?? []).forEach((it) => {
                      init[it.id] = it.quantity;
                    });
                    setOrderEditQty(init);
                    setOrderEditEmail("");
                    setOrderEditAddr({});
                    setOrderEditModalOpen(true);
                  }}
                >
                  주문 수정
                </button>
              ) : null}
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setDetail(null);
                  setDetailLoading(false);
                }}
              >
                닫기
              </button>
              <button
                className="btn primary"
                type="button"
                disabled={!memoDraft.trim() || busy}
                onClick={saveMemo}
              >
                변경사항 저장
              </button>
            </div>
          ) : undefined
        }
      >
        {detailLoading && !detail ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            불러오는 중…
          </div>
        ) : detail ? (
          <>
            {/* 주문 기본 정보 */}
            <div className="dsec">
              <div className="dsec-t">주문 기본 정보</div>
              <Kv
                rows={[
                  ["주문번호", `#${detail.display_id}`],
                  ["주문일시", formatKst(detail.created_at)],
                  ["주문상태", <Badge key="ord" {...orderStatusLabel(detail.status)} />],
                  ["배송상태", isPartial
                    ? <Badge key="fst" label="부분배송" tone="warning" />
                    : <Badge key="fst" {...fulfillmentStatusLabel(detail.fulfillment_status)} />],
                  ["주문 경로", "PC 웹"],
                ]}
              />
            </div>

            {/* 고객 정보 */}
            <div className="dsec">
              <div className="dsec-t">
                고객 정보 <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· 개인정보 마스킹</span>
              </div>
              <Kv
                rows={[
                  ["주문자", customerName(detail)],
                  ["연락처", maskPhone(detail.customer?.phone ?? detail.shipping_address?.phone)],
                  ["이메일", maskEmail(detail.email ?? detail.customer?.email)],
                  ["등급", "일반 회원"],
                ]}
              />
            </div>

            {/* 주문 상품 */}
            <div className="dsec">
              <div className="dsec-t">주문 상품 {detail.items?.length ?? 0}건</div>
              {(detail.items ?? []).map((it) => (
                <div key={it.id} className="dline">
                  {it.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.thumbnail} alt="" className="dl-img" style={{ objectFit: "cover" }} />
                  ) : (
                    <span className="dl-img" />
                  )}
                  <span className="dl-t">
                    <b>{it.product_title}</b>
                    <span>{[it.variant_title, it.variant_sku].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="num">
                    <b>{formatCurrency(it.total, detail.currency_code)}</b>
                    <div className="muted" style={{ fontSize: 12 }}>수량 {it.quantity}</div>
                  </span>
                </div>
              ))}
            </div>

            {/* 결제 정보 */}
            <div className="dsec">
              <div className="dsec-t">결제 정보</div>
              <Kv
                rows={[
                  ["결제수단", "신용카드 (일시불)"],
                  ["결제상태", <Badge key="pay" {...paymentStatusLabel(detail.payment_status)} />],
                  [
                    "상품 합계",
                    formatCurrency(
                      orderItemSubtotal(detail),
                      detail.currency_code
                    ),
                  ],
                  ["배송비", detail.shipping_total != null ? formatCurrency(detail.shipping_total, detail.currency_code) : "—"],
                  [
                    "총 결제금액",
                    <b key="total" style={{ fontSize: 15 }}>
                      {formatCurrency(detail.total, detail.currency_code)}
                    </b>,
                  ],
                ]}
              />
              {canRefund ? (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* 환불 금액 입력 */}
                  <div className="frow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number"
                      className="inp"
                      style={{ width: 130 }}
                      placeholder={`기본 ${detail.total}`}
                      value={refundAmount}
                      onChange={(e) => {
                        setRefundAmount(e.target.value);
                        // 금액 변경 시 새 nonce 발급 (재제출 멱등 리셋)
                        setRefundNonce(crypto.randomUUID());
                      }}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                      {detail.currency_code.toUpperCase()} · 미입력 시 전액
                    </span>
                  </div>

                  {/* 환불 수단 선택 (spec I4) */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label style={{ fontSize: 13, color: "var(--text-3)", minWidth: 64 }}>환불 수단</label>
                    <select
                      className="inp select-like"
                      style={{ width: 160 }}
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as "pg" | "account")}
                    >
                      <option value="pg">PG 취소(원결제)</option>
                      <option value="account">계좌 입금</option>
                    </select>
                  </div>

                  {/* 계좌 입금 선택 시 은행·계좌·예금주 입력 (spec I5) */}
                  {refundMethod === "account" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8, borderLeft: "2px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: 12, color: "var(--text-3)", minWidth: 56 }}>은행</label>
                        <input
                          type="text"
                          className="inp"
                          style={{ width: 120 }}
                          placeholder="국민은행"
                          value={refundAccountBank}
                          onChange={(e) => setRefundAccountBank(e.target.value)}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: 12, color: "var(--text-3)", minWidth: 56 }}>계좌번호</label>
                        <input
                          type="text"
                          className="inp"
                          style={{ width: 160 }}
                          placeholder="000-0000-0000"
                          value={refundAccountNumber}
                          onChange={(e) => setRefundAccountNumber(e.target.value)}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: 12, color: "var(--text-3)", minWidth: 56 }}>예금주</label>
                        <input
                          type="text"
                          className="inp"
                          style={{ width: 120 }}
                          placeholder="홍길동"
                          value={refundAccountHolder}
                          onChange={(e) => setRefundAccountHolder(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {/* 환불 미리보기 — calcRefundPreview / calcReshippingPreview 실제 호출 결과 표시 */}
                  {computedRefundPreview && (
                    <div style={{
                      background: "var(--surface-2, #f8f9fa)",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: 12,
                      color: "var(--text-2)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 2, color: "var(--text)" }}>환불 미리보기</div>
                      {computedRefundPreview.lines.map((l) => {
                        const item = detail.items?.find((it) => it.id === l.id);
                        return (
                          <div key={l.id} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item?.product_title ?? l.id}
                            </span>
                            <span style={{ fontVariantNumeric: "tabular-nums" }}>
                              -{formatCurrency(l.refundAmount, detail.currency_code)}
                            </span>
                          </div>
                        );
                      })}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                        <span>총 환불액</span>
                        <span style={{ color: "var(--danger, #e03131)" }}>
                          -{formatCurrency(computedRefundPreview.totalRefund, detail.currency_code)}
                        </span>
                      </div>
                      {computedReshippingFee > 0 && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--warning, #e67700)" }}>
                          <span>재청구 배송비 (잔여 미달)</span>
                          <span>+{formatCurrency(computedReshippingFee, detail.currency_code)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* 청약철회 (전자상거래법 7일) */}
            <div className="dsec">
              <div className="dsec-t">
                청약철회 <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· 전자상거래법 §17 7일</span>
              </div>
              {!withdrawal || !withdrawal.eligibility ? (
                <div className="muted" style={{ fontSize: 13, padding: "4px 0" }}>
                  배송 완료 후 청약철회가 활성화됩니다.
                </div>
              ) : (
                <>
                  <Kv
                    rows={[
                      [
                        "철회 마감",
                        <span key="dl">
                          {formatKst(withdrawal.eligibility.eligible_until)}{" "}
                          <b style={{ color: withdrawal.eligible ? "var(--primary)" : "var(--text-3)" }}>
                            ({ddayLabel(withdrawal.eligibility.eligible_until)})
                          </b>
                        </span>,
                      ],
                      [
                        "철회 가능",
                        <Badge
                          key="elig"
                          label={withdrawal.eligible ? "가능" : "마감/제외"}
                          tone={withdrawal.eligible ? "success" : "neutral"}
                        />,
                      ],
                      ...(withdrawal.claimed
                        ? ([
                            [
                              "신청 사유",
                              WITHDRAW_REASONS.find((r) => r.code === withdrawal.claimed!.reason)?.label ??
                                withdrawal.claimed.reason,
                            ],
                            ["신청 일시", formatKst(withdrawal.claimed.claimed_at)],
                            [
                              "환불 마감(영업일 3일)",
                              withdrawal.refund_sla ? formatKst(withdrawal.refund_sla) : "—",
                            ],
                          ] as [string, React.ReactNode][])
                        : []),
                    ]}
                  />
                  {withdrawal.eligible && !withdrawal.claimed ? (
                    <div className="frow" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <select
                        className="inp select-like"
                        style={{ width: 140 }}
                        value={withdrawReason}
                        onChange={(e) => setWithdrawReason(e.target.value as WithdrawalReasonCode)}
                      >
                        {WITHDRAW_REASONS.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn"
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirm({ kind: "withdraw" })}
                      >
                        청약철회 접수
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {/* 반품 정책 (RMA) */}
            <div className="dsec">
              <div className="dsec-t">
                반품 정책 <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· RMA</span>
              </div>
              {returnsPolicy ? (
                <Kv
                  rows={[
                    ["정책명", returnsPolicy.name],
                    ["반품 가능기간", `${returnsPolicy.window_days}일`],
                    ["재입고 수수료", `${returnsPolicy.restocking_fee_pct}%`],
                    ["기본 배송비 부담", PAYER_LABEL[returnsPolicy.shipping_fee_payer] ?? returnsPolicy.shipping_fee_payer],
                  ]}
                />
              ) : (
                <div className="muted" style={{ fontSize: 13, padding: "4px 0" }}>
                  등록된 반품 정책이 없습니다.
                </div>
              )}
            </div>

            {/* 배송 정보 */}
            <div className="dsec">
              <div className="dsec-t">배송 정보</div>
              {/* 배송 상태 변경 셀렉트 (prototype: frow + select-like) */}
              <div className="frow">
                <span className="field-l">배송 상태 변경</span>
                <button className="inp select-like" type="button">
                  {fulfillmentStatusLabel(detail.fulfillment_status).label} <ChevronDown size={15} />
                </button>
              </div>
              {/* 택배사 / 송장번호 */}
              {canShip ? (
                <div className="frow">
                  <span className="field-l">택배사 / 송장번호</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <select
                      className="inp select-like"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                    >
                      {CARRIERS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <input
                      className="inp"
                      type="text"
                      placeholder="송장번호 입력"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                    />
                  </div>
                </div>
              ) : ful?.labels?.[0]?.tracking_number ? (
                <div className="frow">
                  <span className="field-l">택배사 / 송장번호</span>
                  <input
                    className="inp"
                    type="text"
                    value={ful.labels[0].tracking_number}
                    readOnly
                  />
                </div>
              ) : null}
              {/* 수령인 주소 */}
              {detail.shipping_address ? (
                <Kv
                  rows={[
                    [
                      "받는 분",
                      [detail.shipping_address.last_name, detail.shipping_address.first_name].filter(Boolean).join(" ") || "—",
                    ],
                    [
                      "주소",
                      [
                        detail.shipping_address.postal_code,
                        detail.shipping_address.province,
                        detail.shipping_address.city,
                        detail.shipping_address.address_1,
                        detail.shipping_address.address_2,
                      ]
                        .filter(Boolean)
                        .join(" ") || "—",
                    ],
                  ]}
                />
              ) : null}
              {/* 출고 처리 버튼 */}
              {canFulfill ? (
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn"
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirm({ kind: "fulfill" })}
                  >
                    출고 처리
                  </button>
                </div>
              ) : null}
              {/* 송장 등록 버튼 */}
              {canShip ? (
                <div style={{ marginTop: 12 }}>
                  <button
                    className="btn primary"
                    type="button"
                    disabled={busy || !tracking.trim()}
                    onClick={() => setConfirm({ kind: "ship" })}
                  >
                    송장 등록
                  </button>
                </div>
              ) : null}
            </div>

            {/* 관리자 메모 */}
            <div className="dsec">
              <div className="dsec-t">
                관리자 메모 <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· 고객 비노출</span>
              </div>
              {/* 메모 목록 */}
              {memos.length > 0 ? (
                <div style={{ marginBottom: 12 }}>
                  {memos.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: "8px 10px",
                        marginBottom: 6,
                        background: "var(--bg-2, #f8f8f8)",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{m.content}</span>
                        {/* canDeleteMemo: 본인/SUPER일 때만 삭제 버튼 노출(§V0-2 production 호출) */}
                        {canDeleteMemo({
                          memoAuthorId: m.author_id,
                          requesterId: currentActorId,
                          requesterRole: currentUserRole,
                        }) ? (
                          <button
                            type="button"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-3, #999)",
                              fontSize: 12,
                              padding: "0 4px",
                              flexShrink: 0,
                            }}
                            disabled={busy}
                            onClick={() => void removeMemo(m.id)}
                          >
                            삭제
                          </button>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3, #999)", marginTop: 4 }}>
                        {m.author_email ?? "알 수 없음"} · {formatKst(m.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {/* 메모 입력 */}
              <textarea
                className="inp"
                placeholder="내부 메모 (고객에게 노출되지 않음, 최대 2000자)"
                value={memoDraft}
                maxLength={2000}
                rows={3}
                onChange={(e) => setMemoDraft(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <button
                className="btn"
                type="button"
                disabled={busy || !isValidMemoContent(memoDraft)}
                onClick={() => void saveMemo()}
                style={{ fontSize: 13 }}
              >
                메모 저장
              </button>
            </div>

            {/* 상태 전이 이력 (StateHistory — BE 워커 신설 중, guard 렌더) */}
            {stateHistory.length > 0 ? (
              <div className="dsec" style={{ marginBottom: 4 }}>
                <div className="dsec-t">
                  상태 전이 이력{" "}
                  <span style={{ color: "var(--text-3)", fontWeight: 400 }}>· StateHistory</span>
                </div>
                {stateHistory.map((ev) => (
                  <div key={ev.id} className="dline" style={{ padding: "8px 0" }}>
                    <span className="dl-t">
                      <b style={{ fontFamily: "monospace", fontSize: 13 }}>{ev.transitionLabel}</b>
                      <span>{formatKst(ev.created_at)}</span>
                    </span>
                    {ev.note ? (
                      <span style={{ fontSize: 12, color: "var(--text-3)" }}>{ev.note}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {/* 반품 접수 모달 (inline — t004, canReturn 시 표시) */}
            {returnModalOpen && canReturn ? (
              <div className="dsec" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <div className="dsec-t">반품 접수</div>
                {/* 반품 라인 선택 */}
                <div style={{ marginBottom: 12 }}>
                  {calcReturnableItems(detail.items ?? []).map((it) => {
                    const selected = returnItems.find((r) => r.id === it.id);
                    return (
                      <div key={it.id} className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReturnItems((prev) => [...prev, { id: it.id, quantity: it.maxQuantity }]);
                            } else {
                              setReturnItems((prev) => prev.filter((r) => r.id !== it.id));
                            }
                          }}
                        />
                        <span style={{ fontSize: 13, flex: 1 }}>{it.product_title}{it.variant_title ? ` · ${it.variant_title}` : ""}</span>
                        {selected ? (
                          <input
                            type="number"
                            className="inp"
                            style={{ width: 64 }}
                            min={1}
                            max={it.maxQuantity}
                            value={selected.quantity}
                            onChange={(e) => {
                              const q = Math.min(it.maxQuantity, Math.max(1, Number(e.target.value)));
                              setReturnItems((prev) => prev.map((r) => r.id === it.id ? { ...r, quantity: q } : r));
                            }}
                          />
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>최대 {it.maxQuantity}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* 반품 사유 선택 */}
                <div className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="field-l" style={{ minWidth: 80 }}>반품 사유</span>
                  <select
                    className="inp select-like"
                    style={{ flex: 1 }}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as RmaReturnReason)}
                  >
                    <option value="CUSTOMER_CHANGE_OF_MIND">단순변심 (소비자 귀책)</option>
                    <option value="PRODUCT_DEFECT">상품불량 (사업자 귀책)</option>
                    <option value="WRONG_DELIVERY">오배송 (사업자 귀책)</option>
                    <option value="OTHER">기타</option>
                  </select>
                </div>
                {/* 배송비 부담 자동 표시 */}
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
                  배송비 부담: {resolveShippingFeePayer(returnReason) === "seller" ? "사업자 부담" : "소비자 부담"}
                  {" "}(사유 기반 자동 판정)
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn primary"
                    type="button"
                    disabled={busy || returnItems.length === 0}
                    onClick={() => setConfirm({ kind: "return" })}
                  >
                    반품 접수 확인
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setReturnModalOpen(false);
                      setReturnItems([]);
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            {/* 교환 접수 모달 (inline — t005, canExchange 시 표시) */}
            {exchangeModalOpen && canExchange ? (
              <div className="dsec" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <div className="dsec-t">교환 생성</div>
                {/* 회수 라인 선택 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>회수 라인 선택</div>
                  {(detail.items ?? []).map((it) => {
                    const selectedLine = exchangeReturnLines.find((r) => r.id === it.id);
                    return (
                      <div key={it.id} className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <input
                          type="checkbox"
                          checked={!!selectedLine}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExchangeReturnLines((prev) => [
                                ...prev,
                                { id: it.id, quantity: it.quantity, unit_price: it.unit_price },
                              ]);
                            } else {
                              setExchangeReturnLines((prev) => prev.filter((r) => r.id !== it.id));
                            }
                          }}
                        />
                        <span style={{ fontSize: 13, flex: 1 }}>
                          {it.product_title}{it.variant_title ? ` · ${it.variant_title}` : ""}
                        </span>
                        {selectedLine ? (
                          <input
                            type="number"
                            className="inp"
                            style={{ width: 64 }}
                            min={1}
                            max={it.quantity}
                            value={selectedLine.quantity}
                            onChange={(e) => {
                              const q = Math.min(it.quantity, Math.max(1, Number(e.target.value)));
                              setExchangeReturnLines((prev) =>
                                prev.map((r) => r.id === it.id ? { ...r, quantity: q } : r)
                              );
                            }}
                          />
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>최대 {it.quantity}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* 신규 변형 입력 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>신규 변형 (variant_id / 수량 / 단가)</div>
                  {exchangeAdditionalLines.map((line, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 60px 90px auto", gap: 6, marginBottom: 6 }}>
                      <input
                        className="inp"
                        type="text"
                        placeholder="variant_id"
                        value={line.variant_id}
                        onChange={(e) => {
                          const v = e.target.value;
                          setExchangeAdditionalLines((prev) =>
                            prev.map((l, i) => i === idx ? { ...l, variant_id: v } : l)
                          );
                        }}
                      />
                      <input
                        className="inp"
                        type="number"
                        placeholder="수량"
                        min={1}
                        value={line.quantity}
                        onChange={(e) => {
                          const q = Math.max(1, Number(e.target.value));
                          setExchangeAdditionalLines((prev) =>
                            prev.map((l, i) => i === idx ? { ...l, quantity: q } : l)
                          );
                        }}
                      />
                      <input
                        className="inp"
                        type="number"
                        placeholder="단가"
                        min={0}
                        value={line.unit_price}
                        onChange={(e) => {
                          const p = Math.max(0, Number(e.target.value));
                          setExchangeAdditionalLines((prev) =>
                            prev.map((l, i) => i === idx ? { ...l, unit_price: p } : l)
                          );
                        }}
                      />
                      <button
                        className="btn"
                        type="button"
                        style={{ padding: "0 8px", fontSize: 12 }}
                        onClick={() =>
                          setExchangeAdditionalLines((prev) => prev.filter((_, i) => i !== idx))
                        }
                        disabled={exchangeAdditionalLines.length <= 1}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  <button
                    className="btn"
                    type="button"
                    style={{ fontSize: 12, marginTop: 4 }}
                    onClick={() =>
                      setExchangeAdditionalLines((prev) => [
                        ...prev,
                        { variant_id: "", quantity: 1, unit_price: 0 },
                      ])
                    }
                  >
                    + 신규 변형 추가
                  </button>
                </div>
                {/* 차액 미리보기 (exchange-logic.ts calcExchangePreviewDiff 실시간 호출) */}
                <div style={{ fontSize: 13, marginBottom: 12, padding: "8px 10px", background: "var(--surface)", borderRadius: 6 }}>
                  <span style={{ color: "var(--text-3)" }}>회수액: </span>
                  <b>{exchangePreviewDiff.refund_total.toLocaleString("ko-KR")}원</b>
                  <span style={{ margin: "0 8px", color: "var(--text-3)" }}>→</span>
                  <span style={{ color: "var(--text-3)" }}>신규액: </span>
                  <b>{exchangePreviewDiff.additional_total.toLocaleString("ko-KR")}원</b>
                  <span style={{ margin: "0 8px", color: "var(--text-3)" }}>차액: </span>
                  <b style={{ color: exchangePreviewDiff.diff > 0 ? "var(--danger)" : exchangePreviewDiff.diff < 0 ? "var(--primary)" : "var(--text)" }}>
                    {exchangePreviewDiff.diff > 0
                      ? `+${exchangePreviewDiff.diff.toLocaleString("ko-KR")}원 (추가결제)`
                      : exchangePreviewDiff.diff < 0
                        ? `${exchangePreviewDiff.diff.toLocaleString("ko-KR")}원 (환불)`
                        : "0원 (등가 교환)"}
                  </b>
                </div>
                {/* 다건 그룹 묶기 옵션 */}
                <div className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <input
                    type="checkbox"
                    id="exg-group-mode"
                    checked={exchangeGroupMode}
                    onChange={(e) => setExchangeGroupMode(e.target.checked)}
                  />
                  <label htmlFor="exg-group-mode" style={{ fontSize: 13, cursor: "pointer" }}>
                    다건 그룹 묶기 (1회 회수 운송장)
                  </label>
                  {exchangeGroupMode ? (
                    <input
                      className="inp"
                      type="text"
                      placeholder="회수 송장번호 (선택)"
                      style={{ flex: 1, fontSize: 12 }}
                      value={exchangePickupTracking}
                      onChange={(e) => setExchangePickupTracking(e.target.value)}
                    />
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn primary"
                    type="button"
                    disabled={busy || exchangeReturnLines.length === 0 || exchangeAdditionalLines.every((l) => !isValidExchangeAdditionalItem(l))}
                    onClick={() => setConfirm({ kind: "exchange" })}
                  >
                    교환 생성 확인
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setExchangeModalOpen(false);
                      setExchangeReturnLines([]);
                      setExchangeAdditionalLines([{ variant_id: "", quantity: 1, unit_price: 0 }]);
                      setExchangeGroupMode(false);
                      setExchangePickupTracking("");
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            {/* 클레임 접수 모달 (inline — t006, canClaim 시 표시) */}
            {claimModalOpen && canClaim ? (
              <div className="dsec" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <div className="dsec-t">클레임 접수</div>
                {/* 대상 라인 선택 */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>클레임 대상 라인 선택</div>
                  {(detail.items ?? []).map((it) => {
                    const selectedLine = claimItems.find((c) => c.id === it.id);
                    return (
                      <div key={it.id} className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <input
                          type="checkbox"
                          checked={!!selectedLine}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setClaimItems((prev) => [...prev, { id: it.id, quantity: it.quantity }]);
                            } else {
                              setClaimItems((prev) => prev.filter((c) => c.id !== it.id));
                            }
                          }}
                        />
                        <span style={{ fontSize: 13, flex: 1 }}>
                          {it.product_title}{it.variant_title ? ` · ${it.variant_title}` : ""}
                        </span>
                        {selectedLine ? (
                          <input
                            type="number"
                            className="inp"
                            style={{ width: 64 }}
                            min={1}
                            max={it.quantity}
                            value={selectedLine.quantity}
                            onChange={(e) => {
                              const q = Math.min(it.quantity, Math.max(1, Number(e.target.value)));
                              setClaimItems((prev) => prev.map((c) => c.id === it.id ? { ...c, quantity: q } : c));
                            }}
                          />
                        ) : (
                          <span className="muted" style={{ fontSize: 12 }}>최대 {it.quantity}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* 클레임 유형 선택 (replace | refund) */}
                <div className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="field-l" style={{ minWidth: 80 }}>클레임 유형</span>
                  <select
                    className="inp select-like"
                    style={{ flex: 1 }}
                    value={claimType}
                    onChange={(e) => setClaimType(e.target.value as ClaimType)}
                  >
                    <option value="replace">대체 발송 (replace)</option>
                    <option value="refund">환불 (refund)</option>
                  </select>
                </div>
                {/* 후속 안내 (spec §3 S2/S3 — resolveClaimOutcome 실시간 호출) */}
                {claimOutcome.action !== "none" ? (
                  <div style={{ fontSize: 12, color: "var(--primary)", marginBottom: 8, padding: "6px 10px", background: "var(--surface)", borderRadius: 6 }}>
                    {claimOutcome.message}
                  </div>
                ) : null}
                {/* 사유 입력 */}
                <div className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="field-l" style={{ minWidth: 80 }}>클레임 사유</span>
                  <input
                    className="inp"
                    type="text"
                    style={{ flex: 1 }}
                    placeholder="클레임 사유를 입력하세요"
                    value={claimReason}
                    onChange={(e) => setClaimReason(e.target.value)}
                  />
                </div>
                {/* 증빙 파일 필드 (d12 file 연동 전 — 파일명/참조 입력 + 검증만, 실제 업로드는 d12) */}
                <div className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="field-l" style={{ minWidth: 80 }}>증빙 파일</span>
                  <input
                    className="inp"
                    type="text"
                    style={{ flex: 1 }}
                    placeholder="증빙 파일명 입력 (필수 — 미입력 시 보류)"
                    value={claimEvidence}
                    onChange={(e) => setClaimEvidence(e.target.value)}
                  />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 12 }}>
                  증빙 미첨부 시 운영 검토 보류 처리됩니다 (§8 C1). 실제 파일 업로드는 파일 관리(d12) 연동 예정.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn primary"
                    type="button"
                    disabled={busy || claimItems.length === 0}
                    onClick={() => setConfirm({ kind: "claim" })}
                  >
                    클레임 접수 확인
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setClaimModalOpen(false);
                      setClaimItems([]);
                      setClaimEvidence("");
                      setClaimReason("");
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            {/* 주문 수정 모달 (inline — t008, canEdit 시 표시: 라인/이메일/배송지 + 차액 미리보기) */}
            {orderEditModalOpen && canEdit ? (
              <div className="dsec" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16 }}>
                <div className="dsec-t">주문 수정 (발송 전)</div>
                {/* 라인 수량 조정 */}
                <div style={{ marginBottom: 12 }}>
                  {(detail.items ?? []).map((it) => (
                    <div key={it.id} className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13, flex: 1 }}>
                        {it.product_title}{it.variant_title ? ` · ${it.variant_title}` : ""}
                        <span className="muted" style={{ fontSize: 12 }}> (현재 {it.quantity}개)</span>
                      </span>
                      <input
                        type="number"
                        className="inp"
                        style={{ width: 72 }}
                        min={0}
                        value={orderEditQty[it.id] ?? it.quantity}
                        onChange={(e) => {
                          const q = Math.max(0, Number(e.target.value));
                          setOrderEditQty((prev) => ({ ...prev, [it.id]: q }));
                        }}
                      />
                    </div>
                  ))}
                  <div className="muted" style={{ fontSize: 12 }}>수량 0 = 라인 삭제</div>
                </div>
                {/* 이메일 수정 */}
                <div className="frow" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="field-l" style={{ minWidth: 80 }}>이메일</span>
                  <input
                    className="inp"
                    type="text"
                    style={{ flex: 1 }}
                    placeholder={`미입력 시 변경 안 함 (현재 ${detail.email ?? "—"})`}
                    value={orderEditEmail}
                    onChange={(e) => setOrderEditEmail(e.target.value)}
                  />
                </div>
                {/* 배송지 수정 */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <input className="inp" type="text" placeholder="수취인명" value={orderEditAddr.first_name ?? ""}
                    onChange={(e) => setOrderEditAddr((p) => ({ ...p, first_name: e.target.value }))} />
                  <input className="inp" type="text" placeholder="연락처" value={orderEditAddr.phone ?? ""}
                    onChange={(e) => setOrderEditAddr((p) => ({ ...p, phone: e.target.value }))} />
                  <input className="inp" type="text" placeholder="주소" style={{ gridColumn: "1 / 3" }} value={orderEditAddr.address_1 ?? ""}
                    onChange={(e) => setOrderEditAddr((p) => ({ ...p, address_1: e.target.value }))} />
                  <input className="inp" type="text" placeholder="도시" value={orderEditAddr.city ?? ""}
                    onChange={(e) => setOrderEditAddr((p) => ({ ...p, city: e.target.value }))} />
                  <input className="inp" type="text" placeholder="우편번호" value={orderEditAddr.postal_code ?? ""}
                    onChange={(e) => setOrderEditAddr((p) => ({ ...p, postal_code: e.target.value }))} />
                </div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>배송지는 일부 입력 시 수취인명·주소·도시 필수</div>
                {/* 차액 미리보기 */}
                {orderEditDiff && orderEditDiff.changedLineCount > 0 ? (
                  <div style={{ fontSize: 13, marginBottom: 12, color: "var(--text)" }}>
                    {orderEditDiff.diff > 0
                      ? `추가 결제 필요: ${formatCurrency(orderEditDiff.additionalPayment, detail.currency_code)}`
                      : orderEditDiff.diff < 0
                      ? `환불 예정: ${formatCurrency(orderEditDiff.refundAmount, detail.currency_code)}`
                      : "차액 없음 (수량 변경 상쇄)"}
                    <span className="muted"> · 변경 라인 {orderEditDiff.changedLineCount}건</span>
                  </div>
                ) : null}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn primary"
                    type="button"
                    disabled={busy}
                    onClick={() => void submitOrderEdit()}
                  >
                    수정 확정
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setOrderEditModalOpen(false);
                      setOrderEditQty({});
                      setOrderEditEmail("");
                      setOrderEditAddr({});
                    }}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : null}

            {/* 처리 이력(메모 목록) */}
            <div className="dsec" style={{ marginBottom: 4 }}>
              <div className="dsec-t">처리 이력</div>
              {memos.length === 0 ? (
                <div className="dline" style={{ padding: "8px 0" }}>
                  <span className="dl-t">
                    <span style={{ color: "var(--text-3)", fontSize: 13 }}>이력이 없습니다.</span>
                  </span>
                </div>
              ) : (
                memos.map((m) => (
                  <div key={m.id} className="dline" style={{ padding: "8px 0" }}>
                    <span className="dl-t">
                      <b>
                        {m.kind === "cancel" ? "강제취소 사유" : m.kind === "system" ? "시스템" : "메모"}
                      </b>
                      <span>
                        {formatKst(m.created_at)} · {m.author_email ?? "—"}
                      </span>
                    </span>
                    <span style={{ fontSize: 13, color: "var(--text)" }}>{m.content}</span>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </DetailDrawer>

      {/* ⑥ 위험 액션 ConfirmModal — prototype OPS.refund / OPS.cancelOrder / OPS.forceDeliver */}
      <ConfirmModal
        open={!!confirm}
        danger={confirm?.kind === "cancel" || confirm?.kind === "refund"}
        title={confirm ? confirmTitle[confirm.kind] : ""}
        message={confirm ? confirmMsg[confirm.kind] : ""}
        confirmText={confirm ? confirmText[confirm.kind] : "확인"}
        meta={
          detail && confirm
            ? {
                target:
                  confirm.kind === "refund"
                    ? `주문 #${detail.display_id} · ${formatCurrency(Number(refundAmount || detail.total), detail.currency_code)}`
                    : `주문 #${detail.display_id}`,
                effect:
                  confirm.kind === "cancel"
                    ? `주문 취소 · 재고 복원 · 자동 환불 · 사유: ${{ fraud: "사기/정책위반", staff: "운영자 취소", inventory: "재고 부족", other: "기타" }[cancelReason]}`
                    : confirm.kind === "refund"
                      ? "결제 취소 · 환불 접수"
                      : confirm.kind === "ship"
                        ? `${carrier} ${tracking}`
                        : confirm.kind === "deliver"
                          ? "배송상태 → 배송 완료"
                          : confirm.kind === "withdraw"
                            ? `청약철회 접수 · ${WITHDRAW_REASONS.find((r) => r.code === withdrawReason)?.label ?? ""}`
                            : confirm.kind === "return"
                              ? `반품 접수 · ${returnReason}`
                              : confirm.kind === "receive_return"
                                ? "반품 수령 처리 → received"
                                : confirm.kind === "exchange"
                                  ? `교환 생성 · 차액 ${exchangePreviewDiff.diff > 0 ? `+${exchangePreviewDiff.diff.toLocaleString("ko-KR")}원 추가결제` : exchangePreviewDiff.diff < 0 ? `${exchangePreviewDiff.diff.toLocaleString("ko-KR")}원 환불` : "등가"}`
                                  : confirm.kind === "claim"
                                    ? `클레임 접수 · ${claimType === "replace" ? "대체 발송" : "환불"} · ${claimItems.length}개 라인`
                                    : "출고 상태로 변경",
                reversible:
                  confirm.kind !== "cancel" && confirm.kind !== "refund",
              }
            : undefined
        }
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      >
        {/* 강제취소 사유 select + 환불예정액·재고복구 안내 (t010 spec §3 S1) */}
        {confirm?.kind === "cancel" && detail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-3)", marginBottom: 4 }}>
                취소 사유 <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value as typeof cancelReason)}
                style={{
                  width: "100%",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "6px 8px",
                  fontSize: 13,
                  background: "var(--surface-2)",
                  color: "var(--text)",
                }}
              >
                <option value="fraud">사기/정책위반 (fraud)</option>
                <option value="staff">운영자 취소 (staff)</option>
                <option value="inventory">재고 부족 (inventory)</option>
                <option value="other">기타 (other)</option>
              </select>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                background: "var(--surface-2)",
                borderRadius: 4,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <span style={{ fontWeight: 600, color: "var(--text-2)" }}>취소 처리 내용</span>
              <span>환불 예정액: {formatCurrency(detail.total ?? 0, detail.currency_code)} (자동 환불)</span>
              <span>재고: 주문 수량만큼 자동 복구</span>
              <span style={{ color: "var(--danger)", fontSize: 11 }}>이 작업은 되돌릴 수 없습니다.</span>
            </div>
          </div>
        ) : null}
      </ConfirmModal>
    </div>
  );
}
