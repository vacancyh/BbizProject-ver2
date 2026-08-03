"use client";

/**
 * 통계·리포트 — 프로토타입 SC.stats 1:1 이식.
 * 데이터 = Medusa 실 주문 집계(stats.ts). 날조 없음.
 */
import { useEffect, useState } from "react";
import { Download, ChevronDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, BarChart, DonutChart } from "@/components/dashboard/Charts";
import type { LineSeries, BarItemT, DonutSeg } from "@/components/dashboard/Charts";
import { formatCurrency } from "@/lib/utils";
import { getStatsSummary, type StatsSummary } from "@/lib/api/stats";

/* ── 헬퍼 ── */
const wonMan = (v: number) => (v / 10000).toLocaleString("ko-KR") + "만";

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="vs">비교 데이터 없음</span>;
  if (pct === 0) return <span className="delta"><Minus size={13} /> 0%</span>;
  return pct > 0
    ? <span className="delta up"><TrendingUp size={13} /> +{pct.toFixed(1)}%</span>
    : <span className="delta down"><TrendingDown size={13} /> {pct.toFixed(1)}%</span>;
}

/* 일별 집계 → LineChart series 변환 */
function buildSalesSeries(summary: StatsSummary): { labels: string[]; series: LineSeries[] } {
  const { daily } = summary;
  if (!daily.length) return { labels: [], series: [] };
  const labels = daily.map((d) => d.date.slice(5)); // MM-DD
  return {
    labels,
    series: [
      { name: "매출", color: "#2563EB", data: daily.map((d) => d.revenue) },
      { name: "주문수", color: "#10B981", data: daily.map((d) => d.orders) },
    ],
  };
}

/* 배송상태 분포 → 카테고리별 매출 도넛 대용 (실 데이터 기반) */
const DONUT_COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

function buildDonut(summary: StatsSummary): DonutSeg[] {
  // fulfillDist를 카테고리 대리로 사용 (실 데이터)
  return summary.fulfillDist.map((d, i) => ({
    label: d.label,
    value: d.count,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
}

/* 결제 상태 분포 → c3 시간대별 주문 분포 (payDist 사용, 시간대 데이터 없음) */
function buildPayBar(summary: StatsSummary): BarItemT[] {
  return summary.payDist.map((d, i) => ({
    label: d.label,
    value: d.count,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
}

/* 인기 상품(매출) → c4 신규 vs 재구매 대용 (단순 top5 bar) */
function buildTopBar(summary: StatsSummary): BarItemT[] {
  return summary.topByRevenue.slice(0, 5).map((p, i) => ({
    label: p.title.length > 8 ? p.title.slice(0, 8) + "…" : p.title,
    value: p.revenue,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));
}

export default function Page() {
  const [data, setData] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getStatsSummary()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e?.message ?? "불러오기 실패"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  if (loading) {
    return (
      <div className="scr">
        <div className="page-header">
          <div className="ph-l">
            <h1>통계·리포트</h1>
            <div className="ph-sub">주문·매출 분석 (실데이터 집계)</div>
          </div>
        </div>
        <div className="empty">
          <h4>불러오는 중…</h4>
          <p>통계 데이터를 집계하고 있습니다.</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="scr">
        <div className="page-header">
          <div className="ph-l">
            <h1>통계·리포트</h1>
          </div>
        </div>
        <div className="empty">
          <h4>불러오지 못했습니다</h4>
          <p>{error ?? "데이터가 없습니다."}</p>
        </div>
      </div>
    );
  }

  const { kpi, currency } = data;
  const salesChart = buildSalesSeries(data);
  const donutSegs = buildDonut(data);
  const donutTotal = donutSegs.reduce((a, s) => a + s.value, 0) || 1;
  const payBars = buildPayBar(data);
  const topBars = buildTopBar(data);

  return (
    <div className="scr">
      {/* ── 페이지 헤더 ── */}
      <div className="page-header">
        <div className="ph-l">
          <h1>통계·리포트</h1>
          <div className="ph-sub">주문·매출 분석 (실데이터 집계)</div>
        </div>
        <div className="ph-actions">
          {/* 동작하지 않던 필터(2026-08-03) — 눌러도 반응이 없어 고장으로 오해되므로 비활성 + 사유를 표시한다. */}
          <button className="select" type="button"
            disabled
            title="기간 필터는 준비 중입니다."
          >
            <span className="sl-k">기간</span> 전체 <ChevronDown size={15} />
          </button>
          {/* 동작하지 않던 버튼(2026-08-03) — 눌러도 반응이 없어 고장으로 오해되므로 비활성 + 사유를 표시한다. */}
          <button className="btn" type="button"
            disabled
            title="통계 리포트 내보내기는 준비 중입니다. 주문/회원 목록에서 엑셀로 받으세요."
          >
            <Download size={16} />
            <span>리포트 내보내기</span>
          </button>
        </div>
      </div>

      {/* ── KPI 4칸 그리드 ── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {/* 총 매출 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">총 매출</span>
            <span className="k-ic">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
            </span>
          </div>
          <div className="k-val">{formatCurrency(kpi.revenue, currency)}</div>
          <div className="k-foot">
            <Delta pct={null} />
          </div>
        </div>

        {/* 순 매출 (환불 제외) */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">순 매출</span>
            <span className="k-ic">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>
            </span>
          </div>
          <div className="k-val">{formatCurrency(kpi.revenue, currency)}</div>
          <div className="k-foot">
            <span className="vs">취소·환불 제외</span>
          </div>
        </div>

        {/* 주문 수 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">주문 수</span>
            <span className="k-ic">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg>
            </span>
          </div>
          <div className="k-val">{kpi.orders.toLocaleString("ko-KR")}</div>
          <div className="k-foot">
            <Delta pct={null} />
          </div>
        </div>

        {/* 평균 주문금액 */}
        <div className="kpi">
          <div className="k-top">
            <span className="k-label">평균 주문금액</span>
            <span className="k-ic">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            </span>
          </div>
          <div className="k-val">{formatCurrency(kpi.aov, currency)}</div>
          <div className="k-foot">
            <Delta pct={null} />
          </div>
        </div>
      </div>

      {/* ── 차트 row 1 ── */}
      <div className="dash-grid2 mb16">
        {/* c1: 일자별 매출/주문 추이 */}
        <div className="card">
          <div className="card-h">
            <h3>일자별 매출·주문 추이</h3>
            <span className="ch-sub">유효 주문 기준</span>
          </div>
          {salesChart.labels.length > 0 ? (
            <>
              <div className="chart-legend">
                {salesChart.series.map((s) => (
                  <span key={s.name} className="lg">
                    <i style={{ background: s.color }} />
                    {s.name}
                  </span>
                ))}
              </div>
              <div className="chart-pad">
                <LineChart labels={salesChart.labels} series={salesChart.series} yfmt={wonMan} />
              </div>
            </>
          ) : (
            <div className="empty">
              <h4>데이터 없음</h4>
              <p>집계할 매출이 없습니다.</p>
            </div>
          )}
        </div>

        {/* c2: 카테고리별 매출 비중 (배송상태 분포 대용) */}
        <div className="card">
          <div className="card-h">
            <h3>주문 배송 상태 비중</h3>
            <span className="ch-sub">전체 주문 기준</span>
          </div>
          {donutSegs.length > 0 ? (
            <div className="donut-wrap">
              <DonutChart
                segments={donutSegs}
                centerTop={kpi.orders.toLocaleString("ko-KR")}
                centerSub="총 주문"
              />
              <div className="donut-legend">
                {donutSegs.map((s) => (
                  <div key={s.label} className="dl">
                    <i style={{ background: s.color }} />
                    <span className="dl-n">{s.label}</span>
                    <b>{Math.round((s.value / donutTotal) * 100)}%</b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty">
              <h4>데이터 없음</h4>
              <p>집계할 주문이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 차트 row 2 ── */}
      <div className="dash-grid2">
        {/* c3: 결제 상태 분포 */}
        <div className="card">
          <div className="card-h">
            <h3>결제 상태 분포</h3>
            <span className="ch-sub">전체 주문 기준</span>
          </div>
          {payBars.length > 0 ? (
            <div className="chart-pad">
              <BarChart items={payBars} />
            </div>
          ) : (
            <div className="empty">
              <h4>데이터 없음</h4>
              <p>집계할 주문이 없습니다.</p>
            </div>
          )}
        </div>

        {/* c4: 인기 상품 매출 Top 5 */}
        <div className="card">
          <div className="card-h">
            <h3>인기 상품 매출 Top 5</h3>
            <span className="ch-sub">매출 기준</span>
          </div>
          {topBars.length > 0 ? (
            <div className="chart-pad">
              <BarChart items={topBars} yfmt={wonMan} />
            </div>
          ) : (
            <div className="empty">
              <h4>판매 데이터 없음</h4>
              <p>집계할 판매 내역이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
