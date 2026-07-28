"use client";

/**
 * 배송 관리 — 프로토타입 SC.shipping 1:1 이식.
 *  - KPI 5개 (배송대기/배송준비/배송중/배송완료/송장오류·확인)
 *  - 세그먼트 탭 (배송대기/배송준비/배송중/배송완료/송장오류·확인)
 *  - 필터바 (주문번호·송장번호 검색 + 택배사/기간 셀렉트 + 조회)
 *  - 테이블 (주문번호/고객/상품/택배사/송장번호/배송상태/kebab)
 *  - 행 클릭 → DetailDrawer (배송정보 kv + 송장등록 폼)
 *  - 실 Medusa 데이터 (listOrders + fulfillments) / KRW 고정.
 */
import { useCallback, useEffect, useState, useRef } from "react";
import {
  Settings,
  Truck,
  Clock,
  Package,
  CheckCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { DetailDrawer } from "@/components/ui/DetailDrawer";
import { useToast } from "@/components/ui/Toast";
import {
  listOrders,
  searchOrders,
  getOrder,
  createShipment,
  type OrderListItem,
  type OrderDetail,
} from "@/lib/api/orders";
import { KR_CARRIERS } from "@/lib/api/shipping";
import {
  fulfillmentStatusLabel,
  maskEmail,
} from "@/lib/orders/status";

// ─── 타입 ──────────────────────────────────────────────────────────────────
type ShipRow = {
  orderId: string;
  displayId: number;
  customer: string;
  product: string;
  carrier: string;
  tracking: string | null;
  fulfillmentStatus: string;
  fulfillmentId: string | null;
  lineItems: { id: string; quantity: number }[];
  shippingAddress?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address_1?: string | null;
    address_2?: string | null;
    city?: string | null;
    province?: string | null;
    postal_code?: string | null;
  } | null;
  email: string | null;
};

type TabKey = "대기" | "준비" | "중" | "완료" | "오류";
type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const PAGE_SIZE = 20;

const BADGE_TONE: Record<string, BadgeTone> = {
  not_fulfilled: "neutral",
  partially_fulfilled: "warning",
  fulfilled: "info",
  partially_shipped: "warning",
  shipped: "neutral",
  partially_delivered: "warning",
  delivered: "success",
  canceled: "danger",
};

// ─── 배송 탭 정의 ───────────────────────────────────────────────────────────
const TABS: { key: TabKey; label: string; statuses: string[] }[] = [
  { key: "대기", label: "배송 대기", statuses: ["not_fulfilled"] },
  { key: "준비", label: "배송 준비", statuses: ["partially_fulfilled", "fulfilled"] },
  { key: "중", label: "배송 중", statuses: ["shipped", "partially_shipped"] },
  { key: "완료", label: "배송 완료", statuses: ["delivered", "partially_delivered"] },
  { key: "오류", label: "송장 오류·확인", statuses: ["requires_action"] },
];

// ─── 아이콘 헬퍼 ───────────────────────────────────────────────────────────
const I = (name: string, size = 16) => {
  const props = { size };
  switch (name) {
    case "settings": return <Settings {...props} />;
    case "truck": return <Truck {...props} />;
    case "clock": return <Clock {...props} />;
    case "package": return <Package {...props} />;
    case "check": return <CheckCircle {...props} />;
    case "alert": return <AlertTriangle {...props} />;
    case "search": return <Search {...props} />;
    case "chevronDown": return <ChevronDown {...props} />;
    case "chevronLeft": return <ChevronLeft {...props} />;
    case "chevronRight": return <ChevronRight {...props} />;
    default: return <MoreVertical {...props} />;
  }
};

// ─── 고객명 ────────────────────────────────────────────────────────────────
function customerLabel(o: OrderListItem): string {
  const n = [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(" ").trim();
  return n || maskEmail(o.email) || "—";
}

// ─── 상품명 ────────────────────────────────────────────────────────────────
function productLabel(o: OrderListItem): string {
  const qty = o.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;
  return qty > 1 ? `상품 ${qty}건` : "상품 1건";
}

// ─── 배송 상태 배지 ────────────────────────────────────────────────────────
function shipStatusBadge(status: string) {
  const { label } = fulfillmentStatusLabel(status);
  const tone = BADGE_TONE[status] ?? "neutral";
  return (
    <span className={`badge ${tone}`}>
      <span className="bdot" />
      {label}
    </span>
  );
}

// ─── 주소 텍스트 ───────────────────────────────────────────────────────────
function addrText(a?: ShipRow["shippingAddress"]): string {
  if (!a) return "—";
  const parts = [a.province, a.city, a.address_1, a.address_2].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

// ─── 송장 추출 ─────────────────────────────────────────────────────────────
function extractTracking(o: OrderListItem | OrderDetail): { carrier: string; tracking: string | null; fulfillmentId: string | null } {
  const fulfillments = "fulfillments" in o ? (o as OrderDetail).fulfillments ?? [] : [];
  const active = fulfillments.find((f) => !f.canceled_at);
  if (!active) return { carrier: "—", tracking: null, fulfillmentId: null };
  const label = active.labels?.[0]?.tracking_number ?? null;
  // tracking_number 형태: "CJ대한통운 12345678" 또는 순수 번호
  let carrier = "—";
  let tracking: string | null = null;
  if (label) {
    const m = label.match(/^(.+?)\s+(\d+)$/);
    if (m) {
      carrier = m[1].trim();
      tracking = m[2].trim();
    } else {
      tracking = label;
    }
  }
  return { carrier, tracking, fulfillmentId: active.id };
}

// ─── 행 변환 ───────────────────────────────────────────────────────────────
function toShipRow(o: OrderListItem): ShipRow {
  const { carrier, tracking, fulfillmentId } = extractTracking(o);
  return {
    orderId: o.id,
    displayId: o.display_id,
    customer: customerLabel(o),
    product: productLabel(o),
    carrier,
    tracking,
    fulfillmentStatus: o.fulfillment_status,
    fulfillmentId,
    lineItems: (o.items ?? []).map((i) => ({ id: (i as { id?: string }).id ?? "", quantity: i.quantity })),
    email: o.email,
  };
}

// ─── 메인 페이지 ───────────────────────────────────────────────────────────
export default function ShippingPage() {
  const toast = useToast();
  const [rows, setRows] = useState<ShipRow[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [carrierFilter, _setCarrierFilter] = useState("전체");
  const [activeTab, setActiveTab] = useState<TabKey>("준비");

  // KPI 집계 (탭별 카운트)
  const [kpi, setKpi] = useState<Record<TabKey, number>>({ 대기: 0, 준비: 0, 중: 0, 완료: 0, 오류: 0 });

  // 상세 드로어
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerBusy, setDrawerBusy] = useState(false);
  const [shipCarrier, setShipCarrier] = useState(KR_CARRIERS[0].name);
  const [shipTracking, setShipTracking] = useState("");

  // KPI 최초 로드 (전체 통계)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 각 탭의 fulfillment_status 기준으로 count 집계
        const _groups = await Promise.all(
          TABS.map(async (tab) => {
            // Medusa REST는 fulfillment_status 필터를 지원하지 않으므로
            // 전체 목록을 가져와 클라이언트 측 집계
            return { key: tab.key, count: 0 };
          })
        );
        // 전체 목록 집계
        const res = await listOrders({ limit: 200 });
        const all = res.orders;
        const counts: Record<TabKey, number> = { 대기: 0, 준비: 0, 중: 0, 완료: 0, 오류: 0 };
        for (const o of all) {
          for (const tab of TABS) {
            if (tab.statuses.includes(o.fulfillment_status)) {
              counts[tab.key]++;
              break;
            }
          }
        }
        if (alive) setKpi(counts);
      } catch {
        // KPI 집계 실패는 조용히 무시
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 목록 로드
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const tabStatuses = TABS.find((t) => t.key === activeTab)?.statuses ?? [];
      // 결제/배송상태 서버 필터(코어 미지원) → /admin/orders-kr/search(searchOrders)
      const res = await searchOrders({
        q: q || undefined,
        fulfillment_status: tabStatuses.length ? tabStatuses.join(",") : undefined,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      });
      // 택배사 필터 (클라이언트 측 — 택배사 버튼 활성화 시)
      const withRows = res.orders.map(toShipRow);
      const carrierFiltered =
        carrierFilter === "전체"
          ? withRows
          : withRows.filter((r) => r.carrier === carrierFilter);
      setRows(carrierFiltered);
      setCount(res.count);
    } catch (e) {
      toast.show(`배송 목록 조회 실패: ${(e as Error).message}`, "danger");
    } finally {
      setLoading(false);
    }
  }, [q, page, activeTab, carrierFilter, toast]);

  useEffect(() => { void load(); }, [load]);

  // 탭 변경 시 1페이지로
  function changeTab(key: TabKey) {
    setActiveTab(key);
    setPage(1);
  }

  // 검색
  function doSearch() {
    setQ(qInput.trim());
    setPage(1);
  }

  // 행 클릭 → 상세 로드
  async function openDetail(row: ShipRow) {
    setDetail(null);
    setShipCarrier(KR_CARRIERS[0].name);
    setShipTracking(row.tracking ?? "");
    setDrawerOpen(true);
    try {
      const { order } = await getOrder(row.orderId);
      setDetail(order);
      // 기존 송장 정보 채워넣기
      const { carrier, tracking } = extractTracking(order);
      if (carrier !== "—") setShipCarrier(carrier);
      if (tracking) setShipTracking(tracking);
    } catch (e) {
      toast.show(`주문 상세 조회 실패: ${(e as Error).message}`, "danger");
    }
  }

  // 송장 등록
  async function registerTracking() {
    if (!detail) return;
    if (!shipTracking.trim()) return toast.show("송장번호를 입력하세요.", "danger");
    // fulfillmentId 결정
    const active = (detail.fulfillments ?? []).find((f) => !f.canceled_at);
    if (!active) return toast.show("출고(fulfillment) 정보가 없습니다. 먼저 출고 처리하세요.", "info");
    const items = (detail.items ?? []).map((i) => ({ id: i.id, quantity: i.quantity }));
    setDrawerBusy(true);
    try {
      await createShipment(detail.id, active.id, items, shipCarrier, shipTracking.trim());
      toast.show("송장을 등록했습니다.");
      setDrawerOpen(false);
      void load();
    } catch (e) {
      toast.show(`송장 등록 실패: ${(e as Error).message}`, "danger");
    } finally {
      setDrawerBusy(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const _tabObj = TABS.find((t) => t.key === activeTab)!;

  // 현재 드로어 대상 row
  const drawerRow = detail
    ? {
        displayId: detail.display_id,
        customer: [detail.customer?.first_name, detail.customer?.last_name].filter(Boolean).join(" ").trim() || maskEmail(detail.email) || "—",
        phone: detail.shipping_address?.phone ?? "—",
        product:
          detail.items?.map((i) => i.product_title).filter(Boolean).join(", ") || "—",
        address: addrText(detail.shipping_address),
        fulfillmentStatus: detail.fulfillment_status,
      }
    : null;

  return (
    <div className="scr">
      {/* ① 페이지 헤더 */}
      <div className="page-header">
        <div className="ph-l">
          <h1>배송 관리</h1>
          <div className="ph-sub">출고 대기 {kpi["대기"]}건 · 배송 중 {kpi["중"]}건</div>
        </div>
        <div className="ph-actions">
          <button className="btn ghost" type="button">
            {I("settings", 16)} <span>배송 설정</span>
          </button>
          <button className="btn primary" type="button">
            {I("truck", 16)} <span>일괄 송장 등록</span>
          </button>
        </div>
      </div>

      {/* ② KPI — 5칸 */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {/* 배송 대기 */}
        <div className="kpi attn">
          <div className="k-top">
            <span className="k-label">배송 대기</span>
            <span className="k-ic">{I("clock", 17)}</span>
          </div>
          <div className="k-val">{kpi["대기"]}건</div>
          <div className="k-foot"><span className="vs">결제완료 후 미처리</span></div>
        </div>
        {/* 배송 준비 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">배송 준비</span>
            <span className="k-ic">{I("package", 17)}</span>
          </div>
          <div className="k-val">{kpi["준비"]}건</div>
          <div className="k-foot"><span className="vs">송장 등록 대기</span></div>
        </div>
        {/* 배송 중 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">배송 중</span>
            <span className="k-ic">{I("truck", 17)}</span>
          </div>
          <div className="k-val">{kpi["중"]}건</div>
          <div className="k-foot"><span className="vs">운송장 추적 가능</span></div>
        </div>
        {/* 배송 완료 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">배송 완료</span>
            <span className="k-ic">{I("check", 17)}</span>
          </div>
          <div className="k-val">{kpi["완료"]}건</div>
          <div className="k-foot"><span className="vs">오늘 기준</span></div>
        </div>
        {/* 송장 오류·확인 */}
        <div className="kpi attn">
          <div className="k-top">
            <span className="k-label">송장 오류·확인</span>
            <span className="k-ic">{I("alert", 17)}</span>
          </div>
          <div className="k-val">{kpi["오류"]}건</div>
          <div className="k-foot"><span className="vs">송장번호 확인 필요</span></div>
        </div>
      </div>

      {/* ③ 세그먼트 탭 */}
      <div className="card mb16">
        <div className="segtabs">
          {TABS.map((t) => (
            <div
              key={t.key}
              className={`segtab ${activeTab === t.key ? "active" : ""}`}
              onClick={() => changeTab(t.key)}
              style={{ cursor: "pointer" }}
            >
              {t.label}
              {kpi[t.key] > 0 ? (
                <span className="cnt">{kpi[t.key].toLocaleString("ko-KR")}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* ④ 필터바 */}
      <div className="card mb16">
        <div className="filterbar">
          <div className="search-input">
            {I("search", 16)}
            <input
              placeholder="주문번호 · 송장번호 검색"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
            />
          </div>
          <button className="select" type="button">
            <span className="sl-k">택배사</span> {carrierFilter} {I("chevronDown", 15)}
          </button>
          <button className="select" type="button">
            <span className="sl-k">기간</span> 최근 7일 {I("chevronDown", 15)}
          </button>
          <span className="spacer" />
          <button className="btn primary" type="button" onClick={doSearch}>
            조회
          </button>
        </div>
      </div>

      {/* ⑤ 테이블 */}
      <div className="card">
        <div className="table-wrap">
          <table className="dt">
            <thead>
              <tr>
                <th className="col-check">
                  <span className="ck js-ckall" />
                </th>
                <th>주문번호</th>
                <th>고객</th>
                <th>상품</th>
                <th>택배사</th>
                <th>송장번호</th>
                <th>배송상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)" }}>
                    불러오는 중…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)" }}>
                    해당 조건의 배송 건이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const noInv = !row.tracking;
                  return (
                    <tr
                      key={row.orderId}
                      className={noInv ? "need-invoice" : ""}
                      style={{ cursor: "pointer" }}
                      onClick={() => openDetail(row)}
                    >
                      <td className="col-check" onClick={(e) => e.stopPropagation()}>
                        <span className="ck js-ckrow" />
                      </td>
                      <td className="strong">#{row.displayId}</td>
                      <td>{row.customer}</td>
                      <td>{row.product}</td>
                      <td className="muted">{row.carrier}</td>
                      <td className="tnum">
                        {noInv ? (
                          <span className="no-invoice">
                            <span className="ni-dot" />
                            미등록
                          </span>
                        ) : (
                          row.tracking
                        )}
                      </td>
                      <td>{shipStatusBadge(row.fulfillmentStatus)}</td>
                      <td>
                        <span className="kebab" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical size={16} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="tablefoot">
          <span className="tf-info">
            {rows.length > 0
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, count)}건 / 전체 ${count.toLocaleString("ko-KR")}건`
              : "0건"}
          </span>
          <span className="spacer" />
          <div className="pager">
            <span
              className={`pg ${page <= 1 ? "dis" : ""}`}
              onClick={() => page > 1 && setPage((p) => p - 1)}
            >
              {I("chevronLeft", 15)}
            </span>
            {Array.from({ length: Math.min(pageCount, 5) }).map((_, i) => {
              const p = i + 1;
              return (
                <span
                  key={p}
                  className={`pg ${p === page ? "active" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </span>
              );
            })}
            <span
              className={`pg ${page >= pageCount ? "dis" : ""}`}
              onClick={() => page < pageCount && setPage((p) => p + 1)}
            >
              {I("chevronRight", 15)}
            </span>
          </div>
        </div>
      </div>

      {/* ⑥ 배송 상세 드로어 */}
      <DetailDrawer
        open={drawerOpen}
        title={detail ? `배송 #${detail.display_id}` : "배송 상세"}
        sub={drawerRow ? `${drawerRow.customer} · ${shipCarrier}` : undefined}
        status={detail ? shipStatusBadge(detail.fulfillment_status) : undefined}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="spacer" style={{ flex: 1 }} />
            <button
              className="btn"
              type="button"
              onClick={() => setDrawerOpen(false)}
            >
              닫기
            </button>
            <button
              className="btn primary"
              type="button"
              disabled={drawerBusy || !detail}
              onClick={registerTracking}
            >
              송장 등록
            </button>
          </div>
        }
      >
        {/* 배송 정보 섹션 */}
        <div className="dsec">
          <div className="dsec-t">배송 정보</div>
          <dl className="kv">
            <dt>주문번호</dt>
            <dd>#{drawerRow?.displayId ?? "—"}</dd>
            <dt>받는 분</dt>
            <dd>{drawerRow?.customer ?? "—"}</dd>
            <dt>연락처</dt>
            <dd>{detail?.shipping_address?.phone ?? "—"}</dd>
            <dt>상품</dt>
            <dd>{drawerRow?.product ?? "—"}</dd>
            <dt>주소</dt>
            <dd>{drawerRow?.address ?? "—"}</dd>
          </dl>
        </div>

        {/* 송장 등록 섹션 */}
        <div className="dsec">
          <div className="dsec-t">송장 등록</div>
          <div className="frow">
            <span className="field-l">택배사</span>
            <CarrierSelectLike
              value={shipCarrier}
              onChange={setShipCarrier}
            />
          </div>
          <div className="frow">
            <span className="field-l">송장번호</span>
            <input
              className="inp"
              placeholder="송장번호 입력"
              value={shipTracking}
              onChange={(e) => setShipTracking(e.target.value)}
            />
          </div>
        </div>
      </DetailDrawer>
    </div>
  );
}

// ─── 택배사 선택 버튼 (select-like) ────────────────────────────────────────
function CarrierSelectLike({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const carriers = KR_CARRIERS.map((c) => c.name);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="inp select-like"
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center" }}
      >
        {value}
        <ChevronDown size={15} style={{ marginLeft: "auto" }} />
      </button>
      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md, 0 4px 16px rgba(0,0,0,.12))",
            zIndex: 20,
          }}
        >
          {carriers.map((c) => (
            <button
              key={c}
              type="button"
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "9px 14px",
                fontSize: 13,
                background: c === value ? "var(--primary-weak)" : "transparent",
                color: c === value ? "var(--primary)" : "var(--text)",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
