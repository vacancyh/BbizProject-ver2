// 관리자 대시보드 — 로그인 직후 운영 현황 요약 화면. (사이드바 최상단 rank:0)
// 숫자는 임시(mock) 데이터(../../lib/dashboard-mock). 실데이터 API 연결 시 mock 만 교체하면 됩니다.
// 차트는 무의존성 SVG 컴포넌트(../../components/charts) 사용 — 외부 차트 패키지 미설치.
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { Link } from "react-router-dom"
import { AdminPage } from "../../components/admin-page"
import { AdminKpiCard } from "../../components/admin-kpi-card"
import { AdminChartCard } from "../../components/admin-chart-card"
import { AdminStatusBadge } from "../../components/admin-status-badge"
import { AdminDataTable, type Column } from "../../components/admin-data-table"
import { BarChart, DonutChart, LineChart } from "../../components/charts"
import { fmt, krw } from "../../lib/admin-format"
import {
  dashboardMock,
  type DashboardAlert,
  type RecentOrder,
  type TopProduct,
} from "../../lib/dashboard-mock"

const ALERT_META: Record<DashboardAlert["level"], { color: "red" | "orange" | "blue"; label: string }> = {
  danger: { color: "red", label: "긴급" },
  warning: { color: "orange", label: "주의" },
  info: { color: "blue", label: "안내" },
}

const recentOrderColumns: Column<RecentOrder>[] = [
  { key: "display", header: "주문번호" },
  { key: "customer", header: "회원" },
  { key: "summary", header: "상품" },
  { key: "total", header: "금액", align: "right", render: (o) => krw(o.total) },
  { key: "status", header: "상태", render: (o) => <AdminStatusBadge tone={o.tone}>{o.status}</AdminStatusBadge> },
]

const topProductColumns: Column<TopProduct>[] = [
  { key: "name", header: "상품명" },
  { key: "category", header: "카테고리" },
  { key: "qty", header: "판매량", align: "right", render: (p) => `${fmt(p.qty)}개` },
  { key: "revenue", header: "매출", align: "right", render: (p) => krw(p.revenue) },
]

const DashboardPage = () => {
  const d = dashboardMock
  const totalOrders = d.orderStatus.reduce((a, s) => a + s.value, 0)

  return (
    <AdminPage variant="dashboard">
      {/* 헤더 */}
      <Container className="flex items-center justify-between p-6">
        <div>
          <Heading level="h1">오늘 운영 현황</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {d.date} · 마지막 업데이트 {d.updated}
          </Text>
        </div>
        <Badge color="green" size="small">
          운영중
        </Badge>
      </Container>

      {/* KPI 카드 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {d.kpis.map((k) => (
          <AdminKpiCard
            key={k.key}
            label={k.label}
            value={k.value}
            delta={k.delta}
            dir={k.dir}
            sub={k.sub}
            attn={k.attn}
            to={k.to}
          />
        ))}
      </div>

      {/* 매출 추이 + 주문 상태 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminChartCard
            title="매출 추이 (최근 7일)"
            legend={d.salesTrend.series.map((s) => ({ label: s.name, color: s.color }))}
          >
            <LineChart
              labels={d.salesTrend.labels}
              series={d.salesTrend.series}
              yfmt={(v) => `${Math.round(v / 1_000_000)}M`}
            />
          </AdminChartCard>
        </div>
        <AdminChartCard
          title="주문 상태"
          legend={d.orderStatus.map((s) => ({ label: s.label, color: s.color, value: `${fmt(s.value)}건` }))}
        >
          <div className="flex items-center justify-center">
            <DonutChart segments={d.orderStatus} centerTop={fmt(totalOrders)} centerSub="전체 주문" />
          </div>
        </AdminChartCard>
      </div>

      {/* 카테고리 매출 + 처리 필요 업무 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminChartCard title="카테고리별 매출 비중 (%)">
            <BarChart items={d.categorySales} yfmt={(v) => `${v}%`} />
          </AdminChartCard>
        </div>
        <Container className="flex flex-col gap-y-3 p-6">
          <Heading level="h2">처리 필요 업무</Heading>
          <div className="flex flex-col gap-y-2">
            {d.queue.map((q) => {
              const body = (
                <div className="flex items-center justify-between rounded-lg border border-ui-border-base px-4 py-3 transition-fg hover:bg-ui-bg-base-hover">
                  <div className="flex items-center gap-x-3">
                    <AdminStatusBadge tone={q.tone} size="small">
                      {q.count}건
                    </AdminStatusBadge>
                    <div>
                      <Text size="small" weight="plus">
                        {q.title}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {q.sub}
                      </Text>
                    </div>
                  </div>
                  {q.hot && (
                    <Badge color="red" size="2xsmall">
                      긴급
                    </Badge>
                  )}
                </div>
              )
              return q.to ? (
                <Link key={q.key} to={q.to} className="block">
                  {body}
                </Link>
              ) : (
                <div key={q.key}>{body}</div>
              )
            })}
          </div>
        </Container>
      </div>

      {/* 최근 주문 + 주요 알림/품절 임박 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Container className="p-0 xl:col-span-2">
          <div className="flex items-center justify-between px-6 py-4">
            <Heading level="h2">최근 주문</Heading>
            <Link to="/orders">
              <Button variant="transparent" size="small">
                전체 보기
              </Button>
            </Link>
          </div>
          <AdminDataTable columns={recentOrderColumns} rows={d.recentOrders} rowKey={(o) => o.id} />
        </Container>

        <div className="flex flex-col gap-y-4">
          <Container className="p-0">
            <div className="px-6 py-4">
              <Heading level="h2">주요 알림</Heading>
            </div>
            <div className="flex flex-col divide-y">
              {d.alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-x-3 px-6 py-4">
                  <Badge color={ALERT_META[a.level].color} size="2xsmall">
                    {ALERT_META[a.level].label}
                  </Badge>
                  <Text size="small">{a.message}</Text>
                </div>
              ))}
            </div>
          </Container>

          <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4">
              <Heading level="h2">품절 임박</Heading>
              <Link to="/products">
                <Button variant="transparent" size="small">
                  재고 관리
                </Button>
              </Link>
            </div>
            <div className="flex flex-col divide-y">
              {d.lowStock.map((s) => (
                <div key={s.name} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <Text size="small">{s.name}</Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {s.category} · 재고 {s.stock}
                    </Text>
                  </div>
                  <AdminStatusBadge tone={s.tone}>{s.label}</AdminStatusBadge>
                </div>
              ))}
            </div>
          </Container>
        </div>
      </div>

      {/* 인기 상품 */}
      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h2">인기 상품 (판매량 기준)</Heading>
        </div>
        <AdminDataTable columns={topProductColumns} rows={d.topProducts} rowKey={(p) => p.name} />
      </Container>

      <Text size="xsmall" className="text-ui-fg-muted px-1">
        ※ 현재 화면의 수치는 실데이터 연결 전 임시(mock) 데이터입니다.
      </Text>
    </AdminPage>
  )
}

export const config = defineRouteConfig({
  label: "대시보드",
  rank: 0,
})

export default DashboardPage
