/**
 * 교환 접수 순수 로직 모듈 (t005_교환 spec §3, §4, §5)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/app/(admin)/orders/page.tsx 가
 *   calcExchangePreviewDiff / canRequestExchange / isValidExchangeAdditionalItem 을 실제 호출.
 */

// ─── 타입 ────────────────────────────────────────────────────────────────────

/** 교환 회수 라인 (회수할 주문 라인 + 수량) */
export type ExchangeReturnLine = {
  /** OrderLineItem id */
  id: string;
  /** 회수 수량 */
  quantity: number;
  /** 라인 단가 (차액 계산에 사용) */
  unit_price: number;
};

/** 교환 신규 지급 라인 (신규 배송할 variant + 수량 + 단가) */
export type ExchangeAdditionalLine = {
  /** 신규 배송 variant id */
  variant_id: string;
  /** 수량 */
  quantity: number;
  /** 단가(원) */
  unit_price: number;
};

/** 차액 미리보기 결과 */
export type ExchangePreviewDiff = {
  /**
   * 총 차액(floor 절사, 백엔드 정합).
   * 양수 = 추가결제 필요, 음수 = 환불 예정
   */
  diff: number;
  /** 회수액 합계 */
  refund_total: number;
  /** 신규 지급액 합계 */
  additional_total: number;
  /** 잔액(끝전 절사 시 생기는 1원 미만 버려진 금액) */
  remainder: number;
};

// ─── 핵심 함수 ───────────────────────────────────────────────────────────────

/**
 * 교환 차액 미리보기 순수함수 (spec §4 I3, UT-003, 백엔드 정합)
 *
 * 계산 규칙 (사장님 결정: 절사 + 잔액보정):
 * 1. 회수액 합계 = Σ(unit_price * quantity) for returnLines
 * 2. 신규 지급액 합계 = Σ(unit_price * quantity) for additionalLines
 * 3. raw diff = additional_total - refund_total
 * 4. floor 절사: diff = Math.floor(raw) → 원 단위 절사(소수점 버림)
 * 5. remainder = raw - diff (잔액보정 보존값, 백엔드가 별도 기록)
 * 6. 부호: diff > 0 → 추가결제, diff < 0 → 환불, diff = 0 → 동일가
 *
 * @param returnLines  회수할 라인 배열 (단가/수량)
 * @param additionalLines  신규 지급 라인 배열 (단가/수량)
 */
export function calcExchangePreviewDiff(
  returnLines: ExchangeReturnLine[],
  additionalLines: ExchangeAdditionalLine[]
): ExchangePreviewDiff {
  // 회수액 합계
  const refund_total = returnLines.reduce(
    (sum, l) => sum + l.unit_price * l.quantity,
    0
  );
  // 신규 지급액 합계
  const additional_total = additionalLines.reduce(
    (sum, l) => sum + l.unit_price * l.quantity,
    0
  );
  // 차액 (raw = float 가능)
  const raw = additional_total - refund_total;
  // 절사(floor) — 백엔드 정합
  const diff = Math.floor(raw);
  // 잔액 보정값
  const remainder = raw - diff;

  return { diff, refund_total, additional_total, remainder };
}

/**
 * 교환 접수 가능 여부 판정 (spec §3 S1)
 * - 주문 fulfillment_status === "delivered" 이고 취소 아님 → true.
 *
 * @param fulfillmentStatus  주문 배송 상태
 * @param orderStatus  주문 상태
 */
export function canRequestExchange(
  fulfillmentStatus: string,
  orderStatus: string
): boolean {
  return fulfillmentStatus === "delivered" && orderStatus !== "canceled";
}

/**
 * 신규 변형 입력 유효성 검증 순수함수 (spec §4 I2)
 *
 * - variant_id 비어있으면 false
 * - quantity ≥ 1 이어야 true
 * - unit_price ≥ 0 이어야 true
 */
export function isValidExchangeAdditionalItem(item: {
  variant_id: string;
  quantity: number;
  unit_price: number;
}): boolean {
  return (
    typeof item.variant_id === "string" &&
    item.variant_id.trim().length > 0 &&
    Number.isFinite(item.quantity) &&
    item.quantity >= 1 &&
    Number.isFinite(item.unit_price) &&
    item.unit_price >= 0
  );
}
