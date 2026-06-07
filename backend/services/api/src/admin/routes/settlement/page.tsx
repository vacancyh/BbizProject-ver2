// 정산 관리 — 정산대시보드/내역/미정산/수수료/환불·차감/설정 탭의 실화면 뼈대.
// 데이터는 임시(mock) 데이터(../../lib/mock-settlement). 실제 결제/환불/수수료/입금 API 연결 시 mock 만 교체.
// 피드백 정책(지시서 §8): 정산 확정 = Confirm→Result Modal, 일반 저장 = Floating Result.
import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Input, Label, Switch, Text } from "@medusajs/ui"
import { AdminPage, type PageVariant } from "../../components/admin-page"
import { AdminKpiCard } from "../../components/admin-kpi-card"
import { AdminChartCard } from "../../components/admin-chart-card"
import { AdminDataTable, type Column } from "../../components/admin-data-table"
import { AdminStatusBadge } from "../../components/admin-status-badge"
import { useAdminConfirm } from "../../components/admin-confirm-modal"
import { AdminResultModal } from "../../components/admin-result-modal"
import { floatingResult } from "../../components/admin-floating-result"
import { BarChart } from "../../components/charts"
import { krw } from "../../lib/admin-format"
import {
  settlementFees,
  settlementHistory,
  settlementKpis,
  settlementRefunds,
  settlementSettings,
  settlementTabs,
  settlementTrend,
  settlementUnsettled,
  type FeeRow,
  type RefundRow,
  type SettlementRow,
  type SettlementTabKey,
} from "../../lib/mock-settlement"

const settlementColumns: Column<SettlementRow>[] = [
  { key: "period", header: "정산 기간" },
  { key: "payout", header: "매출액", align: "right", render: (r) => krw(r.payout) },
  { key: "fee", header: "수수료", align: "right", render: (r) => krw(r.fee) },
  { key: "refund", header: "환불/차감", align: "right", render: (r) => krw(r.refund) },
  { key: "net", header: "정산액", align: "right", render: (r) => krw(r.net) },
  { key: "status", header: "상태", render: (r) => <AdminStatusBadge tone={r.tone}>{r.status}</AdminStatusBadge> },
  { key: "paidAt", header: "지급일" },
]

const feeColumns: Column<FeeRow>[] = [
  { key: "method", header: "결제수단" },
  { key: "rate", header: "수수료율", align: "right" },
  { key: "settlementCycle", header: "정산주기" },
  { key: "note", header: "비고" },
]

const refundColumns: Column<RefundRow>[] = [
  { key: "orderNo", header: "주문번호", render: (r) => `#${r.orderNo}` },
  { key: "customer", header: "주문자" },
  { key: "reason", header: "사유" },
  { key: "type", header: "구분", render: (r) => <AdminStatusBadge tone={r.tone}>{r.type}</AdminStatusBadge> },
  { key: "amount", header: "금액", align: "right", render: (r) => krw(r.amount) },
  { key: "requestedAt", header: "요청일시" },
]

const VARIANT: Record<SettlementTabKey, PageVariant> = {
  dashboard: "dashboard",
  history: "table",
  unsettled: "table",
  fee: "table",
  refund: "table",
  settings: "form",
}

const SettlementPage = () => {
  const [params, setParams] = useSearchParams()
  const active = (params.get("tab") as SettlementTabKey) || "dashboard"
  const confirm = useAdminConfirm()
  const [result, setResult] = useState<{ title: string; message: string } | null>(null)

  const handleConfirmSettlement = async () => {
    const ok = await confirm({
      title: "정산 확정",
      description: "선택한 미정산 내역을 확정할까요? 확정 후에는 되돌릴 수 없습니다.",
      confirmText: "정산 확정",
    })
    if (ok) setResult({ title: "정산 확정 완료", message: "정산을 확정했습니다." })
  }

  return (
    <AdminPage variant={VARIANT[active]}>
      <Container className="p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h1">정산 관리</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              결제/환불/수수료 기반 정산 내역을 관리합니다.
            </Text>
          </div>
          <Badge color="blue" size="small">
            샘플 데이터
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-ui-border-base px-6 py-4">
          {settlementTabs.map((t) => (
            <Button
              key={t.key}
              size="small"
              variant={t.key === active ? "primary" : "secondary"}
              onClick={() => setParams(t.key === "dashboard" ? {} : { tab: t.key })}
            >
              {t.label}
              {t.count != null && <span className="ml-1 opacity-70">{t.count}</span>}
            </Button>
          ))}
        </div>
      </Container>

      {/* 정산 대시보드 */}
      {active === "dashboard" && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {settlementKpis.map((k) => (
              <AdminKpiCard key={k.key} label={k.label} value={k.value} delta={k.delta} dir={k.dir} sub={k.sub} />
            ))}
          </div>
          <AdminChartCard title="월별 정산액 추이">
            <BarChart items={settlementTrend} yfmt={(v) => `${Math.round(v / 1_000_000)}M`} />
          </AdminChartCard>
        </>
      )}

      {/* 정산 내역 */}
      {active === "history" && (
        <Container className="p-0">
          <div className="px-6 py-4">
            <Heading level="h2">정산 내역</Heading>
          </div>
          <AdminDataTable columns={settlementColumns} rows={settlementHistory} rowKey={(r) => r.period} />
        </Container>
      )}

      {/* 미정산 내역 */}
      {active === "unsettled" && (
        <Container className="p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <Heading level="h2">미정산 내역</Heading>
            <Button size="small" onClick={handleConfirmSettlement}>
              정산 확정
            </Button>
          </div>
          <AdminDataTable
            columns={settlementColumns}
            rows={settlementUnsettled}
            rowKey={(r) => r.period}
            emptyText="미정산 내역이 없습니다."
          />
        </Container>
      )}

      {/* 수수료 관리 */}
      {active === "fee" && (
        <Container className="p-0">
          <div className="px-6 py-4">
            <Heading level="h2">수수료 관리</Heading>
          </div>
          <AdminDataTable columns={feeColumns} rows={settlementFees} rowKey={(r) => r.method} />
        </Container>
      )}

      {/* 환불/차감 내역 */}
      {active === "refund" && (
        <Container className="p-0">
          <div className="px-6 py-4">
            <Heading level="h2">환불/차감 내역</Heading>
          </div>
          <AdminDataTable columns={refundColumns} rows={settlementRefunds} rowKey={(r) => `${r.orderNo}-${r.type}`} />
        </Container>
      )}

      {/* 정산 설정 */}
      {active === "settings" && (
        <Container className="flex flex-col gap-y-6 p-6">
          <Heading level="h2">정산 설정</Heading>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label size="small">정산 주기</Label>
              <Input defaultValue={settlementSettings.cycle} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label size="small">정산 은행</Label>
              <Input defaultValue={settlementSettings.bankName} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label size="small">정산 계좌</Label>
              <Input defaultValue={settlementSettings.account} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label size="small">예금주</Label>
              <Input defaultValue={settlementSettings.holder} />
            </div>
            <div className="flex items-center gap-x-3">
              <Switch id="settle-auto" defaultChecked={settlementSettings.autoConfirm} />
              <Label htmlFor="settle-auto" size="small">
                정산 주기 도래 시 자동 확정
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-x-2">
            <Button variant="secondary" onClick={() => floatingResult.draftSaved()}>
              임시 저장
            </Button>
            <Button onClick={() => floatingResult.saved("정산 설정을 저장했습니다.")}>저장</Button>
          </div>
        </Container>
      )}

      <Text size="xsmall" className="text-ui-fg-muted px-1">
        ※ 정산 관리는 추후 결제/환불/수수료/입금 내역 API 연동과 함께 확장됩니다. 현재 수치는 임시(mock) 데이터입니다.
      </Text>

      <AdminResultModal
        open={result != null}
        onOpenChange={(o) => !o && setResult(null)}
        title={result?.title ?? ""}
        message={result?.message ?? ""}
      />
    </AdminPage>
  )
}

export const config = defineRouteConfig({
  label: "정산 관리",
})

export default SettlementPage
