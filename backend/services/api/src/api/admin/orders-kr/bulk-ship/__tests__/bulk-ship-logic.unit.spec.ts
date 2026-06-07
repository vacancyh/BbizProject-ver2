/**
 * 일괄발송 순수 로직 단위 테스트 (vitest)
 *
 * spec: d6 배송관리 — bulk-ship
 */
import { describe, it, expect } from "vitest"
import {
  validateBulkShipItem,
  validateBulkShipRequest,
  buildBulkShipLabel,
  normalizeTrackingNumber,
  BULK_SHIP_MAX,
  type BulkShipItem,
} from "../bulk-ship-logic"

// ─── normalizeTrackingNumber ───────────────────────────────────────────────
describe("normalizeTrackingNumber", () => {
  it("하이픈·공백 제거 후 숫자만 반환한다", () => {
    expect(normalizeTrackingNumber("123-456-789")).toBe("123456789")
    expect(normalizeTrackingNumber("123 456 789")).toBe("123456789")
    expect(normalizeTrackingNumber("  1234567890  ")).toBe("1234567890")
  })

  it("빈 문자열 → 빈 문자열", () => {
    expect(normalizeTrackingNumber("")).toBe("")
  })
})

// ─── validateBulkShipItem ─────────────────────────────────────────────────
describe("validateBulkShipItem", () => {
  const base: BulkShipItem = {
    order_id: "ord_01",
    carrier_code: "cj",
    tracking_number: "1234567890",
  }

  it("정상 항목 → valid + carrier_code + normalized_tracking 반환", () => {
    const result = validateBulkShipItem(base)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.carrier_code).toBe("cj")
      expect(result.normalized_tracking).toBe("1234567890")
    }
  })

  it("하이픈 운송장번호도 정규화 후 통과", () => {
    const result = validateBulkShipItem({ ...base, tracking_number: "1234-5678-90" })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.normalized_tracking).toBe("1234567890")
  })

  it("carrier_code 대문자도 소문자 정규화 후 통과", () => {
    const result = validateBulkShipItem({ ...base, carrier_code: "CJ" })
    expect(result.valid).toBe(true)
    if (result.valid) expect(result.carrier_code).toBe("cj")
  })

  it("order_id 비어 있음 → invalid", () => {
    const result = validateBulkShipItem({ ...base, order_id: "" })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("order_id")
  })

  it("허용 외 carrier_code → invalid", () => {
    const result = validateBulkShipItem({ ...base, carrier_code: "fedex" })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("알 수 없는 택배사")
  })

  it("tracking_number 빈 문자열 → invalid", () => {
    const result = validateBulkShipItem({ ...base, tracking_number: "---" })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.error).toContain("tracking_number")
  })
})

// ─── validateBulkShipRequest ──────────────────────────────────────────────
describe("validateBulkShipRequest", () => {
  const item = (id: string): BulkShipItem => ({
    order_id: id,
    carrier_code: "cj",
    tracking_number: "1234567890",
  })

  it("정상 배열 → valid", () => {
    expect(validateBulkShipRequest([item("ord_01"), item("ord_02")])).toEqual({ valid: true })
  })

  it("빈 배열 → invalid", () => {
    const r = validateBulkShipRequest([])
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.error).toContain("비어 있습니다")
  })

  it("최대 건수 초과 → invalid", () => {
    const overLimit = Array.from({ length: BULK_SHIP_MAX + 1 }, (_, i) => item(`ord_${i}`))
    const r = validateBulkShipRequest(overLimit)
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.error).toContain("최대")
  })

  it("order_id 중복 → invalid", () => {
    const r = validateBulkShipRequest([item("ord_01"), item("ord_01")])
    expect(r.valid).toBe(false)
    if (!r.valid) expect(r.error).toContain("중복")
  })
})

// ─── buildBulkShipLabel ───────────────────────────────────────────────────
describe("buildBulkShipLabel", () => {
  it("CJ대한통운 + 운송장번호 → 표준 Medusa labels 형식 반환", () => {
    const label = buildBulkShipLabel("cj", "1234567890")
    expect(label.tracking_number).toBe("CJ대한통운 1234567890")
    expect(label.tracking_url).toBe("")  // TODO(사장님결정): 택배사 API 키/계약 필요
    expect(label.label_url).toBe("")
  })

  it("epost → 우체국택배 표시명", () => {
    const label = buildBulkShipLabel("epost", "9876543210123")
    expect(label.tracking_number).toBe("우체국택배 9876543210123")
  })
})
