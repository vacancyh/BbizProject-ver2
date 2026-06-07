/**
 * 단위 테스트 — t002_정산KPI경보 (unit_002)
 *
 * UT-001: 정산 KPI 집계 표시
 *   - 샘플 order 배열로 sales/refund/pgFee/net/held 산출 검증
 *   - 0건 빈 처리 검증
 *
 * UT-002: 임계 초과 경보
 *   - 환불률 임계 초과 시 alerts 에 ALERT_REFUND_RATE code 포함
 *   - 임계 이하이면 빈 배열
 *
 * 테스트 전략:
 *  - production ./settlement-kpi-logic 직접 import (복제본 없음)
 *  - DB·MedusaService 의존 없음 (순수 함수)
 */

// ─── production 모듈 직접 import ──────────────────────────────────────────────
import {
  computeSettlementKpi,
  computeKpiAlerts,
  type OrderLike,
  type SettlementKpi,
} from "../settlement-kpi-logic"

// ─── UT-001 — 정산 KPI 집계 표시 ─────────────────────────────────────────────

describe("UT-001: 정산 KPI 집계 표시", () => {
  // --- 샘플 데이터 픽스처 ---
  const sampleOrders: OrderLike[] = [
    { id: "o1", total: 100_000, payment_status: "captured", status: "completed" },
    { id: "o2", total: 200_000, payment_status: "paid",     status: "completed" },
    { id: "o3", total:  50_000, payment_status: "refunded", status: "canceled"  },
    { id: "o4", total:  30_000, payment_status: "partially_refunded", status: "completed" },
    { id: "o5", total:  10_000, payment_status: "awaiting", status: "pending"   },
  ]

  let kpi: SettlementKpi

  beforeAll(() => {
    kpi = computeSettlementKpi(sampleOrders)
  })

  test("sales = captured + paid 주문 total 합산(300,000원)", () => {
    expect(kpi.sales).toBe(300_000)
  })

  test("refund = refunded + partially_refunded 주문 total 합산(80,000원)", () => {
    expect(kpi.refund).toBe(80_000)
  })

  test("pgFee = 0 (settlement_daily 미구현)", () => {
    expect(kpi.pgFee).toBe(0)
  })

  test("net = sales - refund - pgFee(220,000원)", () => {
    expect(kpi.net).toBe(220_000)
  })

  test("held = 0 (settlement_daily 미구현)", () => {
    expect(kpi.held).toBe(0)
  })

  test("string total 도 숫자로 변환하여 집계된다", () => {
    const strOrders: OrderLike[] = [
      { id: "s1", total: "50000", payment_status: "captured" },
      { id: "s2", total: "20000", payment_status: "refunded" },
    ]
    const result = computeSettlementKpi(strOrders)
    expect(result.sales).toBe(50_000)
    expect(result.refund).toBe(20_000)
    expect(result.net).toBe(30_000)
  })

  // --- 0건 빈 처리 ---

  test("빈 배열이면 모든 KPI 가 0이다", () => {
    const result = computeSettlementKpi([])
    expect(result).toEqual({ sales: 0, refund: 0, pgFee: 0, net: 0, held: 0 })
  })

  test("null 이 아닌 빈 배열 — held=0, pgFee=0 도 포함", () => {
    const result = computeSettlementKpi([])
    expect(result.held).toBe(0)
    expect(result.pgFee).toBe(0)
  })

  test("payment_status 가 없는(undefined) 주문은 집계에서 제외된다", () => {
    const orders: OrderLike[] = [
      { id: "x1", total: 99_000 }, // payment_status 없음
    ]
    const result = computeSettlementKpi(orders)
    expect(result.sales).toBe(0)
    expect(result.refund).toBe(0)
  })

  test("total 이 비정상(NaN/undefined)이면 0 으로 처리된다", () => {
    const orders: OrderLike[] = [
      { id: "b1", total: undefined, payment_status: "captured" },
      { id: "b2", total: "NaN",     payment_status: "captured" },
    ]
    const result = computeSettlementKpi(orders)
    expect(result.sales).toBe(0)
  })
})

// ─── UT-002 — 임계 초과 경보 ─────────────────────────────────────────────────

describe("UT-002: 임계 초과 경보", () => {
  // --- 환불률 임계 초과 ---

  test("환불률이 임계(10%)를 초과하면 ALERT_REFUND_RATE code 가 alerts 에 포함된다", () => {
    // sales=100, refund=20 → 환불률=20% > 10%(기본 임계)
    const kpi: SettlementKpi = { sales: 100_000, refund: 20_000, pgFee: 0, net: 80_000, held: 0 }
    const alerts = computeKpiAlerts(kpi)
    const codes = alerts.map((a) => a.code)
    expect(codes).toContain("ALERT_REFUND_RATE")
  })

  test("ALERT_REFUND_RATE 경보의 severity 는 warn 이다", () => {
    const kpi: SettlementKpi = { sales: 100_000, refund: 20_000, pgFee: 0, net: 80_000, held: 0 }
    const alerts = computeKpiAlerts(kpi)
    const alert = alerts.find((a) => a.code === "ALERT_REFUND_RATE")
    expect(alert?.severity).toBe("warn")
  })

  test("ALERT_REFUND_RATE 경보의 message 에 임계값 퍼센트가 포함된다", () => {
    const kpi: SettlementKpi = { sales: 100_000, refund: 20_000, pgFee: 0, net: 80_000, held: 0 }
    const alerts = computeKpiAlerts(kpi, { refundRateThreshold: 0.1 })
    const alert = alerts.find((a) => a.code === "ALERT_REFUND_RATE")
    expect(alert?.message).toContain("10%")
  })

  // --- 임계 이하 → 빈 배열 ---

  test("환불률이 임계(10%) 이하이면 alerts 는 빈 배열이다", () => {
    // sales=100, refund=5 → 환불률=5% ≤ 10%
    const kpi: SettlementKpi = { sales: 100_000, refund: 5_000, pgFee: 0, net: 95_000, held: 0 }
    const alerts = computeKpiAlerts(kpi)
    expect(alerts).toEqual([])
  })

  test("sales=0 이면 환불률 계산을 건너뛰어 경보가 발생하지 않는다", () => {
    const kpi: SettlementKpi = { sales: 0, refund: 0, pgFee: 0, net: 0, held: 0 }
    const alerts = computeKpiAlerts(kpi)
    expect(alerts).toEqual([])
  })

  test("0건 KPI 에서는 경보가 발생하지 않는다", () => {
    const kpi: SettlementKpi = { sales: 0, refund: 0, pgFee: 0, net: 0, held: 0 }
    const alerts = computeKpiAlerts(kpi)
    expect(alerts).toHaveLength(0)
  })

  // --- 커스텀 임계값 ---

  test("커스텀 임계(20%) 설정 시 환불률 15% 는 경보를 발생시키지 않는다", () => {
    // refundRate = 15000/100000 = 15% < 20%
    const kpi: SettlementKpi = { sales: 100_000, refund: 15_000, pgFee: 0, net: 85_000, held: 0 }
    const alerts = computeKpiAlerts(kpi, { refundRateThreshold: 0.2 })
    expect(alerts).toEqual([])
  })

  test("커스텀 임계(5%) 설정 시 환불률 10% 는 경보를 발생시킨다", () => {
    const kpi: SettlementKpi = { sales: 100_000, refund: 10_000, pgFee: 0, net: 90_000, held: 0 }
    const alerts = computeKpiAlerts(kpi, { refundRateThreshold: 0.05 })
    const codes = alerts.map((a) => a.code)
    expect(codes).toContain("ALERT_REFUND_RATE")
  })

  // --- 보류액 임계 (future: settlement_daily 구현 시 활성화) ---

  test("held=0 이면 ALERT_HELD_AMOUNT 경보가 발생하지 않는다", () => {
    const kpi: SettlementKpi = { sales: 100_000, refund: 0, pgFee: 0, net: 100_000, held: 0 }
    const alerts = computeKpiAlerts(kpi)
    const codes = alerts.map((a) => a.code)
    expect(codes).not.toContain("ALERT_HELD_AMOUNT")
  })

  test("held 가 heldAmountThreshold 초과 시 ALERT_HELD_AMOUNT 경보 발생(미래 검증)", () => {
    // settlement_daily 구현 후 held 값이 생기면 이 케이스가 통과
    const kpi: SettlementKpi = { sales: 100_000, refund: 0, pgFee: 0, net: 100_000, held: 2_000_000 }
    const alerts = computeKpiAlerts(kpi, { heldAmountThreshold: 1_000_000 })
    const codes = alerts.map((a) => a.code)
    expect(codes).toContain("ALERT_HELD_AMOUNT")
  })
})
