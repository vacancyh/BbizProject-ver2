"use client";

/**
 * 정산 관리 — 프로토타입(admin-screen-misc.js SC.settlement / DRAWERS.settlement / MISC.confirmSettle) 1:1 이식.
 *  - 실 주문 결제 데이터(승인/캡처/환불)로 집계: KPI + 월별 바차트 + 정산 테이블.
 *  - 5탭 구조(정산 대시보드/정산 내역/미정산/환불·차감/수수료 관리) 유지.
 *  - 행 클릭 → DetailDrawer(.dsec .kv 구조), 정산 확정 → ConfirmModal.
 *  - PG 수수료·세금계산서·실제 지급(payout)은 차기 연동 → EmptyState.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Wallet,
  CheckCircle2,
  RotateCcw,
  Banknote,
  Percent,
  Download,
  Info,
} from "lucide-react";
import {
  EmptyState,
  LoadingSkeleton,
  GapBadge,
  DetailDrawer,
  ConfirmModal,
} from "@/components/ui";
import { BarChart, type BarItemT } from "@/components/dashboard/Charts";
import { formatCurrency } from "@/lib/utils";
import {
  getSettlementSummary,
  type SettlementSummary,
  type SettlementOrder,
  type SettlementDaily,
} from "@/lib/api/settlement";
import {
  settlementRowsToCsv,
  settlementDailyToCsv,
} from "@/lib/settlement/settlement-excel-logic";
import {
  upsertSnapshot,
  closePeriod,
  payPeriod,
} from "@/lib/api/settlement-payout";
import {
  listTaxInvoicesByPeriod,
  type TaxInvoice,
} from "@/lib/api/tax-invoices";

/* ------------------------------------------------------------------ */
/*  상수 & 유틸                                                          */
/* ------------------------------------------------------------------ */

const payLabel: Record<string, string> = {
  authorized: "승인",
  captured: "결제 완료",
  partially_captured: "부분 결제",
  partially_refunded: "부분 환불",
  refunded: "환불",
  not_paid: "미결제",
  awaiting: "입금 대기",
};

type TabId = "dashboard" | "settled" | "unsettled" | "refund" | "fee";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "정산 대시보드" },
  { id: "settled", label: "정산 내역" },
  { id: "unsettled", label: "미정산 내역" },
  { id: "refund", label: "환불·차감" },
  { id: "fee", label: "수수료 관리" },
];

/** 일별 집계를 월별로 재집계해 바차트 items 생성. */
function buildMonthlyBarItems(daily: SettlementDaily[]): BarItemT[] {
  const map = new Map<string, number>();
  for (const d of daily) {
    const month = d.date.slice(0, 7); // "YYYY-MM"
    map.set(month, (map.get(month) ?? 0) + d.net);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-7)
    .map(([month, value]) => ({
      label: `${Number(month.slice(5))}월`,
      value: Math.max(0, Math.round(value / 10000)), // 만 원 단위
      color: "#2563EB",
    }));
}

/* ------------------------------------------------------------------ */
/*  정산 행 타입 (월별 가상 집계)                                         */
/* ------------------------------------------------------------------ */

type SettlementRow = {
  month: string;       // "2026-05"
  label: string;       // "2026년 5월"
  gross: number;
  fee: number;         // 3% 가산 (PG 수수료 없어 0으로 표시)
  refund: number;
  net: number;
  status: "정산 완료" | "정산 예정" | "미정산";
  statusTone: "success" | "primary" | "neutral";
  payDate: string;
};

/** 주문 목록 → 월별 정산 행 집계. */
function buildSettlementRows(orders: SettlementOrder[]): SettlementRow[] {
  const map = new Map<string, { gross: number; refund: number; net: number }>();
  for (const o of orders) {
    const month = o.date.slice(0, 7);
    const cur = map.get(month) ?? { gross: 0, refund: 0, net: 0 };
    cur.gross += o.gross;
    cur.refund += o.refund;
    cur.net += o.net;
    map.set(month, cur);
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1)) // 최신순
    .map(([month, agg]) => {
      const [y, m] = month.split("-");
      const label = `${y}년 ${Number(m)}월`;
      // 현재 달 = 정산 예정, 과거 = 정산 완료, 미래는 없음
      const status: SettlementRow["status"] =
        month === thisMonth ? "정산 예정" : "정산 완료";
      const tone: SettlementRow["statusTone"] =
        month === thisMonth ? "primary" : "success";
      // 지급일: 해당 월 +10일
      const payDate =
        month === thisMonth
          ? `${y}.${m}.10 예정`
          : `${y}.${m}.10`;
      return {
        month,
        label,
        gross: agg.gross,
        fee: 0, // PG 수수료 미연동
        refund: agg.refund,
        net: agg.net,
        status,
        statusTone: tone,
        payDate,
      };
    });
}

/* ------------------------------------------------------------------ */
/*  주문 테이블 (정산 내역 / 미정산 / 환불·차감 탭 공통)                  */
/* ------------------------------------------------------------------ */

function OrderTable({
  rows,
  emptyTitle,
  emptyDesc,
  onRowClick,
}: {
  rows: SettlementOrder[];
  emptyTitle: string;
  emptyDesc: string;
  onRowClick?: (o: SettlementOrder) => void;
}) {
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDesc} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-3">
            <th className="py-2 font-medium">주문</th>
            <th className="py-2 font-medium">일자</th>
            <th className="py-2 font-medium">결제상태</th>
            <th className="py-2 text-right font-medium">승인</th>
            <th className="py-2 text-right font-medium">캡처</th>
            <th className="py-2 text-right font-medium">환불</th>
            <th className="py-2 text-right font-medium">순 정산</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr
              key={o.id}
              className="cursor-pointer border-b border-border/60 hover:bg-surface-2/50"
              onClick={() => onRowClick?.(o)}
            >
              <td className="py-2.5 font-bold text-text-2">#{o.display_id}</td>
              <td className="py-2.5 text-text-3">{o.date}</td>
              <td className="py-2.5 text-text-2">{payLabel[o.payment_status] ?? o.payment_status}</td>
              <td className="py-2.5 text-right tabular-nums text-text">{formatCurrency(o.gross)}</td>
              <td className="py-2.5 text-right tabular-nums text-text">{formatCurrency(o.captured)}</td>
              <td className="py-2.5 text-right tabular-nums text-danger">{formatCurrency(o.refund)}</td>
              <td className="py-2.5 text-right font-bold tabular-nums text-text">{formatCurrency(o.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  뱃지 헬퍼                                                            */
/* ------------------------------------------------------------------ */

function StatusBadge({ label, tone }: { label: string; tone: "success" | "primary" | "neutral" | "danger" }) {
  const cls: Record<string, string> = {
    success: "badge success",
    primary: "badge primary",
    neutral: "badge neutral",
    danger: "badge danger",
  };
  return (
    <span className={cls[tone] ?? "badge neutral"}>
      <span className="bdot" />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  세금계산서 상태 뱃지                                                   */
/* ------------------------------------------------------------------ */

const TAX_STATUS_LABEL: Record<string, { label: string; tone: "success" | "primary" | "neutral" | "danger" }> = {
  pending:   { label: "신청",   tone: "neutral" },
  issued:    { label: "발급",   tone: "success" },
  amended:   { label: "정정",   tone: "primary" },
  cancelled: { label: "취소",   tone: "danger"  },
};

/**
 * 정산 드로어 내 세금계산서 섹션 — period_key 기반 목록 로드.
 * 드로어가 열릴 때 마운트, 닫힐 때 언마운트(데이터 갱신 불필요 시 캐시 무효화).
 * 정산 기간 레코드(payout)가 아직 없으면(open/closed 미확정) 빈 목록으로 표시.
 */
function TaxInvoiceSection({ periodKey }: { periodKey: string }) {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listTaxInvoicesByPeriod(periodKey)
      .then((d) => alive && setInvoices(d.tax_invoices))
      .catch(() => alive && setInvoices([]))   // payout 미존재(404) 포함 — 빈 배열로 처리
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [periodKey]);

  if (loading) {
    return (
      <div className="dsec">
        <div className="dsec-t">세금계산서</div>
        <div className="text-xs text-text-3 py-2">불러오는 중…</div>
      </div>
    );
  }

  return (
    <div className="dsec">
      <div className="dsec-t">
        세금계산서
        <span className="text-xs text-text-3 ml-2">({invoices.length}건)</span>
      </div>
      {invoices.length === 0 ? (
        <div className="text-xs text-text-3 py-2">연결된 세금계산서가 없습니다.</div>
      ) : (
        <div className="kv">
          {invoices.map((inv) => {
            const st = TAX_STATUS_LABEL[inv.status] ?? { label: inv.status, tone: "neutral" as const };
            return (
              <div key={inv.id} className="kv-row" style={{ alignItems: "flex-start", gap: 4 }}>
                <span className="kv-k" style={{ minWidth: 80, flexShrink: 0 }}>
                  {inv.company_name ?? inv.biz_no}
                </span>
                <span className="kv-v" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {formatCurrency(inv.amount)}
                  <StatusBadge label={st.label} tone={st.tone} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  메인 페이지                                                           */
/* ------------------------------------------------------------------ */

export default function Page() {
  const [data, setData] = useState<SettlementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("dashboard");

  // 월별 정산 행 드로어
  const [drawerRow, setDrawerRow] = useState<SettlementRow | null>(null);
  // 주문 드로어 (정산 내역/미정산/환불·차감)
  const [orderDrawer, setOrderDrawer] = useState<SettlementOrder | null>(null);
  // 정산 확정 confirm
  const [confirmRow, setConfirmRow] = useState<SettlementRow | null>(null);
  // 정산 확정 진행 중(중복 클릭 방지)
  const [settling, setSettling] = useState(false);
  // 인라인 토스트
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    let alive = true;
    getSettlementSummary()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.message ?? "불러오기 실패"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const settledRows = useMemo(() => (data?.orders ?? []).filter((o) => o.captured > 0), [data]);
  const unsettledRows = useMemo(() => (data?.orders ?? []).filter((o) => o.captured === 0), [data]);
  const refundRows = useMemo(() => (data?.orders ?? []).filter((o) => o.refund > 0), [data]);
  const settlementRows = useMemo(() => buildSettlementRows(data?.orders ?? []), [data]);
  const monthlyBarItems = useMemo(() => buildMonthlyBarItems(data?.daily ?? []), [data]);

  /**
   * 정산 확정 — settlement-payout 갭B 모듈 연동(§V0 재발방지: GAP_B UI 스텁 → 실 API 배선).
   * 월(period_key)로 스냅샷 upsert(gross/refund, net/pgFee 는 백엔드 산출) → 마감(close) → 지급완료(pay).
   * 이미 닫힌/지급된 기간이면 백엔드 상태머신이 400 → 토스트로 안내.
   */
  const handleConfirmSettle = useCallback(async () => {
    if (!confirmRow || settling) return;
    const periodKey = confirmRow.month; // "2026-05"
    setSettling(true);
    try {
      // 1) 집계 스냅샷 저장(open). pgFee 미지정 → 백엔드 정책 자동계산.
      await upsertSnapshot(periodKey, {
        gross: confirmRow.gross,
        refund: confirmRow.refund,
      });
      // 2) 마감(open→closed)
      await closePeriod(periodKey);
      // 3) 지급완료(closed→paid)
      await payPeriod(periodKey);
      showToast(`${confirmRow.label} 정산을 확정했습니다.`);
      setConfirmRow(null);
      setDrawerRow(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "정산 확정에 실패했습니다.";
      showToast(msg === "UNAUTHORIZED" ? "세션이 만료되었습니다." : `정산 확정 실패: ${msg}`);
    } finally {
      setSettling(false);
    }
  }, [confirmRow, settling, showToast]);

  /** CSV Blob 다운로드 트리거(상품 페이지 패턴 정합). */
  const downloadCsv = useCallback((csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /** 정산 내역(주문별) CSV 내보내기 — settlement-excel-logic 재사용(§V0). pgFee 미연동(0). */
  const exportSettlementCsv = useCallback(() => {
    if (!data) return;
    const iso = new Date().toISOString().slice(0, 10);
    const rows = data.orders.map((o) => ({ ...o, pgFee: 0 }));
    downloadCsv(settlementRowsToCsv(rows), `settlement_orders_${iso}.csv`);
  }, [data, downloadCsv]);

  /** 일별 정산 CSV 내보내기. */
  const exportDailyCsv = useCallback(() => {
    if (!data) return;
    const iso = new Date().toISOString().slice(0, 10);
    const daily = data.daily.map((d) => ({ ...d, pgFee: 0 }));
    downloadCsv(settlementDailyToCsv(daily), `settlement_daily_${iso}.csv`);
  }, [data, downloadCsv]);

  return (
    <div className="scr">
      {/* ① pageHeader */}
      <div className="page-header">
        <div className="ph-l">
          <h1>
            정산 관리
            <GapBadge type="B" compact />
          </h1>
          <div className="ph-sub">
            {data
              ? `이번 달 정산 예정 ${formatCurrency(data.kpi.net)}`
              : "주문 결제 기반 매출·환불·순정산 집계"}
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn" type="button" onClick={exportDailyCsv} disabled={!data}>
            <Download size={16} />
            <span>일별 CSV</span>
          </button>
          <button className="btn primary" type="button" onClick={exportSettlementCsv} disabled={!data}>
            <Download size={16} />
            <span>정산 내역 다운로드</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <EmptyState title="불러오지 못했습니다" description={error} />
      ) : data ? (
        <>
          {/* ② KPI 4카드 */}
          <div className="kpi-grid mb16" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {/* 이번 달 매출 */}
            <div className="kpi">
              <div className="k-top">
                <span className="k-label">이번 달 매출</span>
                <span className="k-ic"><Wallet size={17} /></span>
              </div>
              <div className="k-val">{formatCurrency(data.kpi.gross)}</div>
              <div className="k-foot">
                <span className="vs">{data.kpi.orders}건 · 취소 제외</span>
              </div>
            </div>

            {/* 결제 수수료 */}
            <div className="kpi">
              <div className="k-top">
                <span className="k-label">결제 수수료</span>
                <span className="k-ic"><Percent size={17} /></span>
              </div>
              <div className="k-val">—</div>
              <div className="k-foot">
                <span className="vs">PG 수수료 미연동</span>
              </div>
            </div>

            {/* 환불·차감 */}
            <div className="kpi">
              <div className="k-top">
                <span className="k-label">환불·차감</span>
                <span className="k-ic"><RotateCcw size={17} /></span>
              </div>
              <div className="k-val">{formatCurrency(data.kpi.refund)}</div>
              <div className="k-foot">
                <span className="vs">환불 금액</span>
              </div>
            </div>

            {/* 정산 예정액 */}
            <div className="kpi attn">
              <div className="k-top">
                <span className="k-label">정산 예정액</span>
                <span className="k-ic"><Banknote size={17} /></span>
              </div>
              <div className="k-val">{formatCurrency(data.kpi.net)}</div>
              <div className="k-foot">
                <span className="vs">캡처 − 환불</span>
              </div>
            </div>
          </div>

          {/* ③ 안내 notice */}
          <div className="notice mb16">
            <span className="notice-ic"><Info size={15} /></span>
            <span>
              정산 관리는 추후 <b>결제 · 환불 · 수수료 · 입금 내역</b> 연동과 함께 확장됩니다.
              현재는 주문 결제(승인/캡처/환불) 실데이터 집계입니다.
            </span>
          </div>

          {/* ④ 탭 */}
          <div className="card mb16">
            <div className="segtabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`segtab${tab === t.id ? " active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ⑤ 월별 매출·정산 추이 바차트 (대시보드 탭에서만 표시) */}
          {tab === "dashboard" ? (
            <>
              <div className="card mb16">
                <div className="card-h">
                  <h3>월별 매출 · 정산 추이</h3>
                  <span className="ch-sub">최근 7개월</span>
                </div>
                <div className="chart-pad">
                  {monthlyBarItems.length > 0 ? (
                    <BarChart items={monthlyBarItems} yfmt={(v) => `${v}만`} />
                  ) : (
                    <EmptyState title="데이터 없음" description="집계할 결제 내역이 없습니다." />
                  )}
                </div>
              </div>

              {/* ⑥ 월별 정산 테이블 */}
              <div className="card">
                <div className="card-h">
                  <h3>월별 정산 내역</h3>
                  <span className="ch-sub">정산 현황</span>
                </div>
                {settlementRows.length === 0 ? (
                  <EmptyState title="정산 내역 없음" description="집계할 결제 데이터가 없습니다." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-text-3">
                          <th className="py-2 font-medium">정산월</th>
                          <th className="py-2 text-right font-medium">총 매출</th>
                          <th className="py-2 text-right font-medium">수수료</th>
                          <th className="py-2 text-right font-medium">환불액</th>
                          <th className="py-2 text-right font-medium">정산 금액</th>
                          <th className="py-2 font-medium">상태</th>
                          <th className="py-2 font-medium">지급일</th>
                          <th className="py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {settlementRows.map((row) => (
                          <tr
                            key={row.month}
                            className="cursor-pointer border-b border-border/60 hover:bg-surface-2/50"
                            onClick={() => setDrawerRow(row)}
                          >
                            <td className="py-2.5 font-bold text-text-2">{row.label}</td>
                            <td className="num py-2.5 tabular-nums">{formatCurrency(row.gross)}</td>
                            <td className="num py-2.5 tabular-nums text-text-3">
                              {row.fee > 0 ? formatCurrency(row.fee) : "—"}
                            </td>
                            <td className="num py-2.5 tabular-nums text-text-3">
                              {formatCurrency(row.refund)}
                            </td>
                            <td className="num py-2.5 font-bold tabular-nums">{formatCurrency(row.net)}</td>
                            <td className="py-2.5">
                              <StatusBadge label={row.status} tone={row.statusTone} />
                            </td>
                            <td className="py-2.5 text-text-3">{row.payDate}</td>
                            <td className="py-2.5">
                              <button
                                type="button"
                                className="kebab"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDrawerRow(row);
                                }}
                                aria-label="더보기"
                              >
                                ⋯
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* 정산 내역 탭 */}
          {tab === "settled" ? (
            <div className="card">
              <div className="card-h">
                <h3>정산 내역</h3>
                <span className="ch-sub">실 수금 발생 주문</span>
              </div>
              <OrderTable
                rows={settledRows}
                emptyTitle="정산 내역 없음"
                emptyDesc="캡처(실 수금)된 주문이 없습니다."
                onRowClick={(o) => setOrderDrawer(o)}
              />
            </div>
          ) : null}

          {/* 미정산 탭 */}
          {tab === "unsettled" ? (
            <div className="card">
              <div className="card-h">
                <h3>미정산 내역</h3>
                <span className="ch-sub">캡처 대기 주문</span>
              </div>
              <OrderTable
                rows={unsettledRows}
                emptyTitle="미정산 내역 없음"
                emptyDesc="캡처 대기 중인 주문이 없습니다."
                onRowClick={(o) => setOrderDrawer(o)}
              />
            </div>
          ) : null}

          {/* 환불·차감 탭 */}
          {tab === "refund" ? (
            <div className="card">
              <div className="card-h">
                <h3>환불·차감 내역</h3>
                <span className="ch-sub">환불 발생 주문</span>
              </div>
              <OrderTable
                rows={refundRows}
                emptyTitle="환불·차감 없음"
                emptyDesc="환불이 발생한 주문이 없습니다."
                onRowClick={(o) => setOrderDrawer(o)}
              />
            </div>
          ) : null}

          {/* 수수료 관리 탭 */}
          {tab === "fee" ? (
            <div className="card">
              <div className="card-h">
                <h3>수수료 관리</h3>
              </div>
              <EmptyState
                icon={<Percent size={26} />}
                title="차기 연동 예정"
                description="PG 수수료 요율·세금계산서·실제 지급(payout) 정산은 정산 커스텀 모듈에서 다룹니다(후속). 현재는 주문 결제(승인/캡처/환불) 실데이터만 집계합니다."
              />
            </div>
          ) : null}

          {/* 후속 안내 */}
          <div className="flex items-start gap-2 rounded bg-surface-2 p-3 text-xs text-text-2 mt-4">
            <GapBadge type="B" compact />
            <span>
              PG 수수료·세금계산서·실제 지급(payout) 정산은 정산 커스텀 모듈에서 다룹니다(후속). 현재 화면은 주문 결제(승인/캡처/환불) 실데이터 집계입니다.
            </span>
          </div>
        </>
      ) : null}

      {/* ─── DetailDrawer: 월별 정산 행 ─── */}
      <DetailDrawer
        open={drawerRow !== null}
        title={drawerRow ? `${drawerRow.label} 정산` : ""}
        sub="월별 정산 상세"
        status={
          drawerRow ? (
            <StatusBadge label={drawerRow.status} tone={drawerRow.statusTone} />
          ) : undefined
        }
        onClose={() => setDrawerRow(null)}
        footer={
          drawerRow ? (
            <div className="flex w-full items-center">
              {drawerRow.status === "정산 예정" ? (
                <div className="danger-zone mr-auto">
                  <button
                    type="button"
                    className="btn danger"
                    onClick={() => setConfirmRow(drawerRow)}
                  >
                    정산 확정
                  </button>
                </div>
              ) : (
                <span className="spacer" />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setDrawerRow(null)}
                >
                  닫기
                </button>
                <button type="button" className="btn primary">
                  정산서 PDF
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {drawerRow ? (
          <>
            <div className="dsec">
              <div className="dsec-t">{drawerRow.label} 정산 내역</div>
              <div className="kv">
                <div className="kv-row">
                  <span className="kv-k">총 매출</span>
                  <span className="kv-v">{formatCurrency(drawerRow.gross)}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-k">결제 수수료</span>
                  <span className="kv-v">{drawerRow.fee > 0 ? formatCurrency(drawerRow.fee) : "—"}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-k">환불·차감</span>
                  <span className="kv-v">{formatCurrency(drawerRow.refund)}</span>
                </div>
                <div className="kv-row">
                  <span className="kv-k">정산 금액</span>
                  <span className="kv-v">
                    <b style={{ fontSize: 15 }}>{formatCurrency(drawerRow.net)}</b>
                  </span>
                </div>
                <div className="kv-row">
                  <span className="kv-k">지급 예정</span>
                  <span className="kv-v">{drawerRow.payDate}</span>
                </div>
              </div>
            </div>
            {/* 세금계산서 연동 섹션 — d7 정산↔세금계산서 링크 */}
            <TaxInvoiceSection periodKey={drawerRow.month} />
          </>
        ) : null}
      </DetailDrawer>

      {/* ─── DetailDrawer: 주문 상세 ─── */}
      <DetailDrawer
        open={orderDrawer !== null}
        title={orderDrawer ? `주문 #${orderDrawer.display_id}` : ""}
        sub={orderDrawer ? `${orderDrawer.date} · ${payLabel[orderDrawer.payment_status] ?? orderDrawer.payment_status}` : ""}
        onClose={() => setOrderDrawer(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => setOrderDrawer(null)}>
              닫기
            </button>
          </div>
        }
      >
        {orderDrawer ? (
          <div className="dsec">
            <div className="dsec-t">주문 정산 상세</div>
            <div className="kv">
              <div className="kv-row">
                <span className="kv-k">주문번호</span>
                <span className="kv-v">#{orderDrawer.display_id}</span>
              </div>
              <div className="kv-row">
                <span className="kv-k">결제 상태</span>
                <span className="kv-v">{payLabel[orderDrawer.payment_status] ?? orderDrawer.payment_status}</span>
              </div>
              <div className="kv-row">
                <span className="kv-k">승인 금액</span>
                <span className="kv-v">{formatCurrency(orderDrawer.gross)}</span>
              </div>
              <div className="kv-row">
                <span className="kv-k">캡처(실 수금)</span>
                <span className="kv-v">{formatCurrency(orderDrawer.captured)}</span>
              </div>
              <div className="kv-row">
                <span className="kv-k">환불액</span>
                <span className="kv-v" style={{ color: "var(--danger)" }}>
                  {formatCurrency(orderDrawer.refund)}
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-k">순 정산액</span>
                <span className="kv-v">
                  <b style={{ fontSize: 15 }}>{formatCurrency(orderDrawer.net)}</b>
                </span>
              </div>
              <div className="kv-row">
                <span className="kv-k">일자</span>
                <span className="kv-v">{orderDrawer.date}</span>
              </div>
            </div>
          </div>
        ) : null}
      </DetailDrawer>

      {/* ─── ConfirmModal: 정산 확정 (settlement-payout 연동) ─── */}
      <ConfirmModal
        open={confirmRow !== null}
        danger
        title="정산을 확정하시겠습니까?"
        message="확정 후에는 정산 금액을 수정할 수 없습니다. 스냅샷 저장 → 마감 → 지급완료가 한 번에 처리됩니다."
        confirmText={settling ? "처리 중…" : "정산 확정"}
        cancelText="취소"
        meta={{
          target: confirmRow ? `${confirmRow.label} · ${formatCurrency(confirmRow.net)}` : undefined,
          effect: "정산 확정 · 지급완료 기록",
          reversible: false,
        }}
        onConfirm={() => void handleConfirmSettle()}
        onCancel={() => { if (!settling) setConfirmRow(null); }}
      />

      {/* 인라인 토스트 */}
      {toast ? (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--text)",
            color: "var(--surface)",
            padding: "10px 20px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            zIndex: 999,
            whiteSpace: "nowrap",
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
