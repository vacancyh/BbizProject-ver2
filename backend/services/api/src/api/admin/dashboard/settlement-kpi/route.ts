/**
 * 정산 KPI·경보 Admin API
 *
 *  - GET /admin/dashboard/settlement-kpi
 *      query.graph 로 order 안전 조회 → computeSettlementKpi + computeKpiAlerts 호출
 *      → { kpi, alerts, period } 반환
 *
 * d7_정산관리(settlement_daily) 미구현 → order 기반 안전 집계.
 * 데이터 없거나 조회 실패 시 200 + 0/빈배열 반환(503 회피).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  computeSettlementKpi,
  computeKpiAlerts,
  AlertThresholds,
} from "./settlement-kpi-logic"

// period 쿼리 파라미터 타입
type Period = "today" | "week" | "month"

// KST(UTC+9) 기준 날짜 경계(시작 Date) 산출
function kstPeriodStart(period: Period): Date {
  const now = new Date()
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)

  if (period === "today") {
    // KST 오늘 자정
    const d = new Date(kstNow)
    d.setUTCHours(0, 0, 0, 0)
    return new Date(d.getTime() - 9 * 60 * 60 * 1000) // UTC 로 변환
  } else if (period === "week") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  } else {
    // month
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const period: Period =
    (req.query?.period as Period | undefined) &&
    ["today", "week", "month"].includes(req.query.period as string)
      ? (req.query.period as Period)
      : "today"

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // 안전 조회 헬퍼 — 실패 시 빈 배열 (stats/route.ts 동일 패턴)
  const safeGraph = async (config: Record<string, unknown>): Promise<any[]> => {
    try {
      const { data } = await query.graph(config as any)
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  }

  // order 조회 (period 필터는 JS 레벨에서 처리 — query.graph filters 안전 최소화)
  let orders = await safeGraph({
    entity: "order",
    fields: ["id", "total", "status", "payment_status", "created_at"],
    pagination: { take: 1000, skip: 0 },
  })

  // period 필터 적용
  const periodStart = kstPeriodStart(period)
  orders = orders.filter((o) => {
    if (!o?.created_at) return false
    return new Date(o.created_at) >= periodStart
  })

  // (a) KPI 집계 — settlement-kpi-logic 직접 호출
  const kpi = computeSettlementKpi(orders)

  // 임계 설정 (쿼리로 오버라이드 가능, 기본값 사용)
  const thresholds: AlertThresholds = {}
  if (req.query?.refundRateThreshold) {
    const v = parseFloat(req.query.refundRateThreshold as string)
    if (Number.isFinite(v)) thresholds.refundRateThreshold = v
  }
  if (req.query?.heldAmountThreshold) {
    const v = parseFloat(req.query.heldAmountThreshold as string)
    if (Number.isFinite(v)) thresholds.heldAmountThreshold = v
  }

  // (b) 경보 판정 — settlement-kpi-logic 직접 호출
  const alerts = computeKpiAlerts(kpi, thresholds)

  res.json({
    kpi,
    alerts,
    period,
  })
}
