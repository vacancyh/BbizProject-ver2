/**
 * 일괄발송 순수 로직 모듈 (DOM·fetch·req 의존 없음 — 단위 테스트 가능).
 *
 * 주요 함수:
 *  - validateBulkShipItem     : 개별 항목 형식 검증 (carrier, tracking_number)
 *  - validateBulkShipRequest  : 요청 전체 검증 (order_id 중복, 최대 건수 등)
 *  - buildBulkShipLabel       : Medusa 송장 labels 형식 생성
 *
 * spec: d6 배송관리 — bulk-ship
 * §V0-2: 본 모듈의 모든 export 함수는 route.ts 가 실호출합니다. dead code 금지.
 */

/** 허용 택배사 코드 (lib/api/shipping.ts KR_CARRIERS 와 정합) */
export const ALLOWED_CARRIERS = ["cj", "epost", "hanjin", "lotte", "logen"] as const
export type CarrierCode = (typeof ALLOWED_CARRIERS)[number]

/** 택배사 코드 → 표시명 매핑 */
export const CARRIER_NAME: Record<CarrierCode, string> = {
  cj: "CJ대한통운",
  epost: "우체국택배",
  hanjin: "한진택배",
  lotte: "롯데택배",
  logen: "로젠택배",
}

/** 일괄발송 요청 1건 */
export type BulkShipItem = {
  order_id: string
  /** 출고(fulfillment) ID. 미전달 시 route 에서 활성 fulfillment 자동 조회. */
  fulfillment_id?: string | null
  /** 택배사 코드 (cj | epost | hanjin | lotte | logen) */
  carrier_code: string
  /** 운송장번호 (하이픈 허용, 서버에서 정규화) */
  tracking_number: string
  /** 대상 라인 아이템 배열 (미전달 시 전체 항목 자동 적용) */
  items?: { id: string; quantity: number }[] | null
}

/** 항목 검증 결과 */
export type BulkShipItemValidation =
  | { valid: true; carrier_code: CarrierCode; normalized_tracking: string }
  | { valid: false; error: string }

/** 요청 전체 검증 결과 */
export type BulkShipRequestValidation =
  | { valid: true }
  | { valid: false; error: string }

/** 최대 일괄발송 건수 (서버 부하 제한) */
export const BULK_SHIP_MAX = 100

/**
 * 운송장번호 정규화 — 숫자만 추출 (하이픈·공백 제거).
 */
export function normalizeTrackingNumber(raw: string): string {
  return (raw ?? "").replace(/[^0-9]/g, "")
}

/**
 * 개별 항목 형식 검증.
 *
 * - order_id 비어 있음 → invalid
 * - carrier_code 허용 목록 외 → invalid
 * - tracking_number 비어 있음 → invalid
 * - 성공 시 정규화된 carrier_code, normalized_tracking 반환
 */
export function validateBulkShipItem(item: BulkShipItem): BulkShipItemValidation {
  if (!item.order_id || !item.order_id.trim()) {
    return { valid: false, error: "order_id 가 비어 있습니다." }
  }
  const carrier = (item.carrier_code ?? "").trim().toLowerCase()
  if (!(ALLOWED_CARRIERS as readonly string[]).includes(carrier)) {
    return {
      valid: false,
      error: `알 수 없는 택배사 코드: ${item.carrier_code}. (허용: ${ALLOWED_CARRIERS.join(", ")})`,
    }
  }
  const normalized = normalizeTrackingNumber(item.tracking_number ?? "")
  if (!normalized) {
    return { valid: false, error: "tracking_number 가 비어 있습니다." }
  }
  return { valid: true, carrier_code: carrier as CarrierCode, normalized_tracking: normalized }
}

/**
 * 요청 전체 검증.
 *
 * - 빈 배열 → invalid
 * - 최대 건수(BULK_SHIP_MAX) 초과 → invalid
 * - order_id 중복 → invalid (동일 주문 2회 발송 방지)
 */
export function validateBulkShipRequest(
  items: BulkShipItem[]
): BulkShipRequestValidation {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: "발송 항목이 비어 있습니다." }
  }
  if (items.length > BULK_SHIP_MAX) {
    return {
      valid: false,
      error: `일괄발송은 최대 ${BULK_SHIP_MAX}건까지 처리할 수 있습니다. (요청: ${items.length}건)`,
    }
  }
  const seen = new Set<string>()
  for (const item of items) {
    const key = item.order_id?.trim() ?? ""
    if (!key) continue
    if (seen.has(key)) {
      return { valid: false, error: `order_id 중복: ${key} (동일 주문 2회 발송 불가)` }
    }
    seen.add(key)
  }
  return { valid: true }
}

/**
 * Medusa createShipmentWorkflow 에 전달할 labels 배열 생성.
 *
 * Medusa 표준 형식: [{ tracking_number, tracking_url, label_url }]
 * tracking_number 는 "택배사명 운송장번호" 조합 (기존 apps/admin createShipment 패턴 정합).
 *
 * TODO(사장님결정): 택배사 API 키/계약 필요 — 실연동 시 tracking_url/label_url 을
 *   CarrierAdapter.getTrackingUrl(carrier_code, tracking_number) 로 교체하세요.
 */
export function buildBulkShipLabel(
  carrierCode: CarrierCode,
  normalizedTracking: string
): { tracking_number: string; tracking_url: string; label_url: string } {
  const carrierName = CARRIER_NAME[carrierCode]
  return {
    tracking_number: `${carrierName} ${normalizedTracking}`.trim(),
    tracking_url: "", // TODO(사장님결정): 택배사 API 키/계약 필요
    label_url: "",    // TODO(사장님결정): 택배사 API 키/계약 필요
  }
}
