// 배송 관리 — 단계별 탭(배송대기/준비/중/완료/송장/설정) 실화면 뼈대.
// 데이터는 임시(mock) 데이터(../../lib/mock-shipping). 실제 주문/택배사/송장 API 연결 시 mock 만 교체.
// 피드백 정책(지시서 §8): 위험/일괄 작업 = Confirm→Result Modal, 일반 저장 = Floating Result.
import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Input, Label, Switch, Text } from "@medusajs/ui"
import { AdminPage } from "../../components/admin-page"
import { AdminDataTable, type Column } from "../../components/admin-data-table"
import { AdminStatusBadge } from "../../components/admin-status-badge"
import { useAdminConfirm } from "../../components/admin-confirm-modal"
import { AdminResultModal } from "../../components/admin-result-modal"
import { floatingResult } from "../../components/admin-floating-result"
import {
  shippingRows,
  shippingSettings,
  shippingTabs,
  type ShipmentRow,
  type ShipmentTabKey,
} from "../../lib/mock-shipping"

const columns: Column<ShipmentRow>[] = [
  { key: "orderNo", header: "주문번호", render: (r) => `#${r.orderNo}` },
  { key: "customer", header: "주문자" },
  { key: "items", header: "상품" },
  { key: "courier", header: "택배사" },
  { key: "tracking", header: "송장번호" },
  { key: "requestedAt", header: "접수일시" },
  { key: "status", header: "상태", render: (r) => <AdminStatusBadge tone={r.tone}>{r.status}</AdminStatusBadge> },
]

const ShippingPage = () => {
  const [params, setParams] = useSearchParams()
  const active = (params.get("tab") as ShipmentTabKey) || "waiting"
  const confirm = useAdminConfirm()
  const [result, setResult] = useState<{ title: string; message: string } | null>(null)

  const isSettings = active === "settings"

  const handleBulkInvoice = async () => {
    const ok = await confirm({
      title: "송장 일괄 발급",
      description: "현재 탭의 배송 준비 주문에 대해 송장을 일괄 발급할까요?",
      confirmText: "발급",
    })
    if (ok) setResult({ title: "발급 완료", message: "송장을 발급했습니다." })
  }

  return (
    <AdminPage variant={isSettings ? "form" : "table"}>
      <Container className="p-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h1">배송 관리</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              주문 배송 상태를 단계별로 관리합니다.
            </Text>
          </div>
          <Badge color="blue" size="small">
            샘플 데이터
          </Badge>
        </div>

        {/* 탭 (?tab= 동기화) */}
        <div className="flex flex-wrap gap-2 border-t border-ui-border-base px-6 py-4">
          {shippingTabs.map((t) => (
            <Button
              key={t.key}
              size="small"
              variant={t.key === active ? "primary" : "secondary"}
              onClick={() => setParams(t.key === "waiting" ? {} : { tab: t.key })}
            >
              {t.label}
              {t.count != null && <span className="ml-1 opacity-70">{t.count}</span>}
            </Button>
          ))}
        </div>
      </Container>

      {/* 본문 */}
      {isSettings ? (
        <Container className="flex flex-col gap-y-6 p-6">
          <Heading level="h2">배송 설정</Heading>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label size="small">기본 배송비 (원)</Label>
              <Input type="number" defaultValue={shippingSettings.baseFee} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label size="small">무료배송 기준 금액 (원)</Label>
              <Input type="number" defaultValue={shippingSettings.freeThreshold} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label size="small">기본 택배사</Label>
              <Input defaultValue={shippingSettings.defaultCourier} />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label size="small">제주/도서산간 추가비 (원)</Label>
              <Input type="number" defaultValue={shippingSettings.jejuExtraFee} />
            </div>
            <div className="flex items-center gap-x-3">
              <Switch id="ship-auto" />
              <Label htmlFor="ship-auto" size="small">
                결제 완료 시 자동으로 배송 준비 상태로 전환
              </Label>
            </div>
          </div>
          <div className="flex justify-end gap-x-2">
            <Button variant="secondary" onClick={() => floatingResult.draftSaved()}>
              임시 저장
            </Button>
            <Button onClick={() => floatingResult.saved("배송 설정을 저장했습니다.")}>저장</Button>
          </div>
        </Container>
      ) : (
        <Container className="p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <Heading level="h2">{shippingTabs.find((t) => t.key === active)?.label}</Heading>
            {(active === "ready" || active === "invoice") && (
              <Button size="small" onClick={handleBulkInvoice}>
                송장 일괄 발급
              </Button>
            )}
          </div>
          <AdminDataTable
            columns={columns}
            rows={shippingRows[active as Exclude<ShipmentTabKey, "settings">] ?? []}
            rowKey={(r) => r.orderNo}
            emptyText="해당 단계의 배송 건이 없습니다."
          />
        </Container>
      )}

      <Text size="xsmall" className="text-ui-fg-muted px-1">
        ※ 배송 관리는 추후 주문/택배사/송장 API 연동과 함께 확장됩니다. 현재 수치는 임시(mock) 데이터입니다.
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
  label: "배송 관리",
})

export default ShippingPage
