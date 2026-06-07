/**
 * 정산 KPI 집계 + 경보 판정 순수 로직 모듈
 *
 * d1_대시보드 t002_정산KPI경보 — settlement_daily 테이블 미구현(d7 대기)이므로
 * order 배열 기반으로 안전 집계한다. 0건이면 전부 0/빈 배열 반환.
 */

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

/** order 집계에 사용할 최소 필드 */
export interface OrderLike {
  id?: string
  total?: number | string
  status?: string
  payment_status?: string
}

/** 정산 KPI 집계 결과 */
export interface SettlementKpi {
  /** 매출(캡처된 주문 total 합) */
  sales: number
  /** 환불(환불/부분환불 주문 total 합) */
  refund: number
  /** PG 수수료 (settlement_daily 없으면 0) */
  pgFee: number
  /** 순정산 = 매출 - 환불 - PG수수료 */
  net: number
  /** 보류액 (settlement_daily 없으면 0) */
  held: number
}

/** 경보 항목 */
export interface KpiAlert {
  code: string
  message: string
  severity: "warn" | "error"
}

/** 경보 판정 임계 설정 */
export interface AlertThresholds {
  /** 환불률 임계(0~1, 예: 0.1 = 10%) — 기본 0.1 */
  refundRateThreshold?: number
  /** 보류액 임계(절대값, 원) — 기본 1_000_000 */
  heldAmountThreshold?: number
  /** 미정산 지연 임계(미사용, settlement_daily 없으므로 0) */
  unsettledDelayDays?: number
}

// ─── 내부 헬퍼 ────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v as string) : (v as number)
  return Number.isFinite(n) ? Number(n) : 0
}

// ─── (a) KPI 집계 함수 ────────────────────────────────────────────────────────

/**
 * order 배열을 받아 정산 KPI 를 산출한다.
 *
 * - 매출 = payment_status 가 captured/paid 인 주문 total 합
 * - 환불 = payment_status 가 refunded/partially_refunded 인 주문 total 합
 * - pgFee = 0 (settlement_daily 미구현)
 * - net = sales - refund - pgFee
 * - held = 0 (settlement_daily 미구현)
 * - 0건이면 전부 0
 */
export function computeSettlementKpi(orders: OrderLike[]): SettlementKpi {
  if (!Array.isArray(orders) || orders.length === 0) {
    return { sales: 0, refund: 0, pgFee: 0, net: 0, held: 0 }
  }

  const PAY_CAPTURED = new Set(["captured", "paid"])
  const PAY_REFUND = new Set(["refunded", "partially_refunded"])

  let sales = 0
  let refund = 0

  for (const o of orders) {
    const ps = String(o?.payment_status ?? "")
    const total = toNum(o?.total)
    if (PAY_CAPTURED.has(ps)) {
      sales += total
    } else if (PAY_REFUND.has(ps)) {
      refund += total
    }
  }

  const pgFee = 0
  const held = 0
  const net = sales - refund - pgFee

  return { sales, refund, pgFee, net, held }
}

// ─── (b) 경보 판정 함수 ───────────────────────────────────────────────────────

/**
 * KPI + 임계 설정을 받아 경보 배열을 산출한다.
 *
 * - 환불률(refund/sales) > refundRateThreshold 이면 ALERT_REFUND_RATE 경보
 * - held > heldAmountThreshold 이면 ALERT_HELD_AMOUNT 경보
 * - 0건 / 임계 이하이면 빈 배열
 */
export function computeKpiAlerts(
  kpi: SettlementKpi,
  thresholds?: AlertThresholds
): KpiAlert[] {
  const {
    refundRateThreshold = 0.1,
    heldAmountThreshold = 1_000_000,
  } = thresholds ?? {}

  const alerts: KpiAlert[] = []

  // 환불률 임계 초과 검사
  if (kpi.sales > 0) {
    const refundRate = kpi.refund / kpi.sales
    if (refundRate > refundRateThreshold) {
      alerts.push({
        code: "ALERT_REFUND_RATE",
        message: `환불률이 임계(${Math.round(refundRateThreshold * 100)}%)를 초과했습니다. 현재 환불률: ${Math.round(refundRate * 1000) / 10}%`,
        severity: "warn",
      })
    }
  }

  // 보류액 임계 초과 검사 (settlement_daily 구현 후 held > 0 이 될 때 활성화)
  if (kpi.held > heldAmountThreshold) {
    alerts.push({
      code: "ALERT_HELD_AMOUNT",
      message: `보류액(${kpi.held.toLocaleString()}원)이 임계(${heldAmountThreshold.toLocaleString()}원)를 초과했습니다.`,
      severity: "error",
    })
  }

  return alerts
}
