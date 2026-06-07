"use client";

/**
 * 대시보드 — 디자인 프로토타입(admin-screen-dashboard.js)의 7섹션을 1:1 이식.
 *  ① pageHeader  ② 처리 필요 업무 5카드  ③ KPI 그리드
 *  ④ 매출 추이 라인차트 + 처리 대기 큐  ⑤ 주문상태 bar + 카테고리 도넛
 *  ⑥ 최근 주문 + 인기 상품  ⑦ 리뷰·문의 알림 + 품절 임박
 * 마크업/클래스/차트는 프로토타입 그대로, 데이터만 Medusa 실연동(mock 금지).
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Package,
  RotateCcw,
  MessageSquare,
  AlertTriangle,
  Star,
  Download,
  ChevronRight,
  ChevronDown,
  ShoppingCart,
  UserPlus,
  Banknote,
  Box,
} from "lucide-react";
import { LineChart, BarChart, DonutChart } from "@/components/dashboard/Charts";
import { formatCurrency } from "@/lib/utils";
import { paymentStatusLabel } from "@/lib/orders/status";
import { getDashboardSummary, getSettlementKpi, type DashboardSummary, type SettlementKpiResponse } from "@/lib/api/dashboard";
import type { Period } from "@/lib/dashboard/dashboard-logic";
import "./dashboard.css";

/** prototype ICON 이름 → lucide-react 아이콘 매핑(시각적으로 동일). */
const ICON: Record<string, React.ReactNode> = {
  clock: <Clock size={18} />,
  package: <Package size={18} />,
  refund: <RotateCcw size={18} />,
  message: <MessageSquare size={18} />,
  alert: <AlertTriangle size={18} />,
};
const KPI_ICON: Record<string, React.ReactNode> = {
  won: <Banknote size={17} />,
  cart: <ShoppingCart size={17} />,
  clock: <Clock size={17} />,
  package: <Package size={17} />,
  refund: <RotateCcw size={17} />,
  userPlus: <UserPlus size={17} />,
  box: <Box size={17} />,
};
const QUEUE_ICON: Record<string, React.ReactNode> = {
  clock: <Clock size={17} />,
  package: <Package size={17} />,
  refund: <RotateCcw size={17} />,
  message: <MessageSquare size={17} />,
};

const wonMan = (v: number) => (v / 10000).toLocaleString("ko-KR") + "만";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

const PERIOD_LABELS: Record<Period, string> = {
  today: "오늘",
  week: "이번 주",
  month: "이번 달",
};

export default function Page() {
  const router = useRouter();
  const [d, setD] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("today");
  const [settlementKpi, setSettlementKpi] = useState<SettlementKpiResponse | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getDashboardSummary(period)
      .then((res) => alive && setD(res))
      .catch((e) => alive && setError(e?.message ?? "불러오기 실패"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [period]);

  useEffect(() => {
    let alive = true;
    setSettlementLoading(true);
    getSettlementKpi(period)
      .then((res) => alive && setSettlementKpi(res))
      .catch(() => alive && setSettlementKpi(null))
      .finally(() => alive && setSettlementLoading(false));
    return () => {
      alive = false;
    };
  }, [period]);

  if (loading)
    return (
      <div className="dash">
        <div className="empty">
          <div className="e-ic">
            <Box size={26} />
          </div>
          <h4>불러오는 중…</h4>
          <p>대시보드 데이터를 집계하고 있습니다.</p>
        </div>
      </div>
    );
  if (error || !d)
    return (
      <div className="dash">
        <div className="empty">
          <div className="e-ic">
            <AlertTriangle size={26} />
          </div>
          <h4>불러오지 못했습니다</h4>
          <p>{error ?? "데이터가 없습니다."}</p>
        </div>
      </div>
    );

  const catTotal = d.category.reduce((a, s) => a + s.value, 0);

  return (
    <div className="dash">
      {/* ① 페이지 헤더 */}
      <div className="page-header">
        <div className="ph-l">
          <h1>오늘 운영 현황</h1>
          <div className="ph-sub">
            {d.date} · 마지막 업데이트 {d.updated}
          </div>
        </div>
        <div className="ph-actions">
          <div className="select period-toggle" style={{ display: "flex", gap: 0, padding: 0 }}>
            {(["today", "week", "month"] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`period-btn${period === p ? " active" : ""}`}
                style={{
                  padding: "0 12px",
                  height: "100%",
                  background: period === p ? "var(--primary)" : "transparent",
                  color: period === p ? "#fff" : "var(--text-2)",
                  border: "none",
                  borderRadius: p === "today" ? "6px 0 0 6px" : p === "month" ? "0 6px 6px 0" : "0",
                  cursor: "pointer",
                  fontWeight: period === p ? 600 : 400,
                  fontSize: 13,
                  lineHeight: "34px",
                  transition: "background 0.15s",
                }}
                onClick={() => setPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          <button className="btn" type="button">
            <Download size={16} />
            <span>리포트 내보내기</span>
          </button>
        </div>
      </div>

      {/* ② 처리 필요 업무 */}
      <div className="action-priority">
        <div className="ap-head">
          <span className="ap-title">처리 필요 업무</span>
          <span className="ap-sub">오늘 먼저 확인하세요</span>
        </div>
        <div className="ap-grid">
          {d.priorities.map((p) => (
            <button key={p.key} className={`ap-card ${p.tone}`} type="button" onClick={() => router.push(p.route)}>
              <span className="ap-ic">{ICON[p.icon]}</span>
              <span className="ap-n">{p.count}</span>
              <span className="ap-l">{p.label}</span>
              <span className="ap-s">
                {p.sub}
                <ChevronRight size={14} />
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ③ KPI 그리드 */}
      <div className="kpi-grid">
        {d.kpis.map((k) => (
          <div key={k.key} className={`kpi ${k.attn ? "attn" : ""}`}>
            <div className="k-top">
              <span className="k-label">{k.label}</span>
              <span className="k-ic">{KPI_ICON[k.icon] ?? KPI_ICON.box}</span>
            </div>
            <div className="k-val">{k.value}</div>
            <div className="k-foot">
              <span className="vs">전체 누적</span>
            </div>
          </div>
        ))}
      </div>

      {/* ③-B 정산 KPI 현황 */}
      <div className="card" data-testid="settlement-kpi" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <h3>정산 현황</h3>
          <span className="ch-sub">{PERIOD_LABELS[period]} 기준</span>
          <span className="ch-r">
            <button className="link" type="button" onClick={() => router.push("/settlement")}>
              정산 관리
            </button>
          </span>
        </div>
        {settlementLoading ? (
          <div className="empty" style={{ padding: "16px 0" }}>
            <p>집계 중…</p>
          </div>
        ) : (
          <>
            <div className="kpi-grid" style={{ marginTop: 8 }}>
              {[
                { key: "sales",  label: "매출",     value: settlementKpi?.kpi.sales  ?? 0 },
                { key: "refund", label: "환불",     value: settlementKpi?.kpi.refund ?? 0 },
                { key: "pgFee",  label: "PG 수수료", value: settlementKpi?.kpi.pgFee  ?? 0 },
                { key: "net",    label: "순정산",    value: settlementKpi?.kpi.net    ?? 0 },
                { key: "held",   label: "보류",      value: settlementKpi?.kpi.held   ?? 0 },
              ].map((item) => (
                <div key={item.key} className="kpi">
                  <div className="k-top">
                    <span className="k-label">{item.label}</span>
                    <span className="k-ic"><Banknote size={17} /></span>
                  </div>
                  <div className="k-val">
                    {"₩" + Math.round(item.value).toLocaleString("ko-KR")}
                  </div>
                  <div className="k-foot">
                    <span className="vs">{PERIOD_LABELS[period]}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* 경보 배지 */}
            {settlementKpi && settlementKpi.alerts.length > 0 ? (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {settlementKpi.alerts.map((alert, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`ap-card ${alert.severity === "critical" ? "red" : alert.severity === "warning" ? "amber" : "blue"}`}
                    style={{ textAlign: "left", cursor: "pointer" }}
                    onClick={() => router.push("/settlement")}
                  >
                    <span className="ap-ic"><AlertTriangle size={16} /></span>
                    <span className="ap-l">[{alert.code}] {alert.message}</span>
                    <span className="ap-s">
                      정산 관리로 이동
                      <ChevronRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 10, color: "var(--text-3)", fontSize: 13 }}>
                경보 없음
              </div>
            )}
          </>
        )}
      </div>

      {/* ④ 매출 추이 + 처리 대기 큐 */}
      <div className="dash-main">
        <div className="card">
          <div className="card-h">
            <h3>매출 추이</h3>
            <span className="ch-sub">최근 7일</span>
            <span className="ch-r">
              <button className="select" type="button">
                일별 <ChevronDown size={15} />
              </button>
            </span>
          </div>
          <div className="chart-legend">
            {d.salesTrend.series.map((s) => (
              <span key={s.name} className="lg">
                <i style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
          <div className="chart-pad">
            <LineChart labels={d.salesTrend.labels} series={d.salesTrend.series} yfmt={wonMan} />
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>처리 대기 업무</h3>
            <span className="ch-r">
              <button className="link" type="button" onClick={() => router.push("/orders")}>
                주문으로
              </button>
            </span>
          </div>
          <div className="queue-list">
            {d.queue.map((q, i) => (
              <div
                key={i}
                className="queue-row"
                onClick={() => router.push(q.icon === "message" ? "/reviews" : "/orders")}
              >
                <span className={`q-ic ${q.ic}`}>{QUEUE_ICON[q.icon]}</span>
                <span className="q-l">
                  <b>{q.t}</b>
                  <span>{q.s}</span>
                </span>
                <span className={`q-n ${q.hot ? "hot" : ""}`}>{q.n}</span>
                <span className="q-go">
                  <ChevronRight size={16} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ⑤ 주문상태 bar + 카테고리 도넛 */}
      <div className="dash-grid2">
        <div className="card">
          <div className="card-h">
            <h3>주문 상태 분포</h3>
            <span className="ch-sub">진행중 주문 기준</span>
          </div>
          <div className="chart-pad">
            {d.orderStatus.length ? (
              <BarChart items={d.orderStatus} />
            ) : (
              <div className="empty">
                <div className="e-ic">
                  <Box size={26} />
                </div>
                <h4>데이터 없음</h4>
                <p>집계할 주문이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>카테고리별 매출 비중</h3>
            <span className="ch-sub">이번 달</span>
          </div>
          {d.category.length ? (
            <div className="donut-wrap">
              <DonutChart segments={d.category} centerTop="100%" centerSub="전체 매출" />
              <div className="donut-legend">
                {d.category.map((s) => (
                  <div key={s.label} className="dl">
                    <i style={{ background: s.color }} />
                    <span className="dl-n">{s.label}</span>
                    <b>{Math.round((s.value / catTotal) * 100)}%</b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty">
              <div className="e-ic">
                <Box size={26} />
              </div>
              <h4>카테고리 매출 데이터 없음</h4>
              <p>주문 상품에 연결된 카테고리 정보가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* ⑥ 최근 주문 + 인기 상품 */}
      <div className="dash-grid3 mb16">
        <div className="card">
          <div className="card-h">
            <h3>최근 주문</h3>
            <span className="ch-r">
              <button className="link" type="button" onClick={() => router.push("/orders")}>
                전체 보기
              </button>
            </span>
          </div>
          {d.recentOrders.length ? (
            <div className="rank">
              {d.recentOrders.map((o) => {
                const pay = paymentStatusLabel(o.payment_status);
                return (
                  <div key={o.id} className="rank-row" style={{ cursor: "pointer" }} onClick={() => router.push("/orders")}>
                    <span className="r-name" style={{ flex: "0 0 90px", color: "var(--text-2)", fontWeight: 600 }}>
                      #{o.display_id}
                    </span>
                    <span className="r-name">
                      {o.email ?? "고객"}
                      <span style={{ color: "var(--text-3)", fontWeight: 400 }}> · {fmtDate(o.created_at)}</span>
                    </span>
                    <span className="r-meta">
                      <b>{formatCurrency(o.total, o.currency_code)}</b>
                    </span>
                    <span className={`badge ${pay.tone}`}>
                      <span className="bdot" />
                      {pay.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty">
              <div className="e-ic">
                <Box size={26} />
              </div>
              <h4>주문 없음</h4>
              <p>아직 주문이 없습니다.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>인기 상품 TOP 5</h3>
            <span className="ch-sub">판매 수량 기준</span>
            <span className="ch-r">
              <button className="link" type="button" onClick={() => router.push("/stats")}>
                통계
              </button>
            </span>
          </div>
          {d.topProducts.length ? (
            <div className="rank">
              {d.topProducts.map((p, i) => (
                <div key={p.title} className="rank-row">
                  <span className={`rk ${i < 3 ? "top" : ""}`}>{i + 1}</span>
                  <span className="r-img" />
                  <span className="r-name">
                    {p.title}
                    <span style={{ color: "var(--text-3)", fontWeight: 400 }}> · {p.sub}</span>
                  </span>
                  <span className="r-meta">
                    <b>{p.qty.toLocaleString("ko-KR")}건</b>
                    <span>{formatCurrency(p.amount)}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="e-ic">
                <Box size={26} />
              </div>
              <h4>판매 데이터 없음</h4>
              <p>집계할 판매 내역이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* ⑦ 리뷰·문의 알림 + 품절 임박 */}
      <div className="dash-grid3">
        <div className="card">
          <div className="card-h">
            <h3>리뷰 · 문의 알림</h3>
            <span className="ch-r">
              <button className="link" type="button" onClick={() => router.push("/reviews")}>
                CS 센터
              </button>
            </span>
          </div>
          {d.feed.length ? (
            <div className="feed">
              {d.feed.map((f, i) => (
                <div key={i} className="feed-row">
                  <span
                    className="f-ic"
                    style={{
                      background: f.tone === "amber" ? "var(--warning-weak)" : "var(--primary-weak)",
                      color: f.tone === "amber" ? "var(--warning)" : "var(--primary)",
                    }}
                  >
                    {f.type === "review" ? <Star size={15} /> : <MessageSquare size={15} />}
                  </span>
                  <span className="f-b">
                    <span className="f-t">
                      {f.txt}{" "}
                      {f.stars ? (
                        <span className="stars">
                          {"★".repeat(f.stars)}
                          {"☆".repeat(5 - f.stars)}
                        </span>
                      ) : null}
                    </span>
                    <span className="f-m">{f.meta}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="e-ic">
                <MessageSquare size={26} />
              </div>
              <h4>알림 없음</h4>
              <p>최근 리뷰·문의가 없습니다.</p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>품절 임박 상품</h3>
            <span className="ch-sub">재고 25개 이하</span>
            <span className="ch-r">
              <button className="link" type="button" onClick={() => router.push("/products")}>
                상품 관리
              </button>
            </span>
          </div>
          {d.lowStock.length ? (
            <div className="rank">
              {d.lowStock.map((p, i) => (
                <div key={i} className="rank-row" style={{ cursor: "pointer" }} onClick={() => router.push("/products")}>
                  <span className="r-img" />
                  <span className="r-name">
                    {p.title}
                    <span style={{ color: "var(--text-3)", fontWeight: 400 }}> · {p.sku}</span>
                  </span>
                  <span className="r-meta">
                    <b style={{ color: p.qty <= 0 ? "var(--danger)" : "var(--warning)" }}>{p.qty}개</b>
                  </span>
                  <span className={`badge ${p.tone}`}>
                    <span className="bdot" />
                    {p.badge}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <div className="e-ic">
                <Package size={26} />
              </div>
              <h4>품절 임박 없음</h4>
              <p>재고 추적이 설정되어 있지 않거나 임박 항목이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
