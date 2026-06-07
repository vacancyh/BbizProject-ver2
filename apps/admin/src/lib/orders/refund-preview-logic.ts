/**
 * 환불 미리보기 순수 로직 (DB·req·React 의존 없음)
 *
 * BE refund-logic.ts 의 calcProratedRefund / calcReshippingFee 와
 * 완전히 동일한 절사+잔액보정 규칙을 FE 에서 재현.
 * 제출 전 모달에서 라인별/총 환불액·재청구 배송비를 미리보기로 표시하는 용도.
 *
 * spec: dag/d2_주문관리/t007_환불.md §1 F6·F7, §4 I3
 */

// ─── 입출력 타입 ───────────────────────────────────────────────────────────────

/** 환불 라인 입력 */
export interface RefundLineInput {
  /** order line item id */
  id: string;
  /** 라인 환불 요청 금액(원) */
  amount: number;
}

/** calcRefundPreview 입력 */
export interface RefundPreviewInput {
  /** 환불 대상 라인별 금액 */
  lines: RefundLineInput[];
  /** 전체 쿠폰 할인액(양수) */
  couponDiscount: number;
  /** 전체 포인트 사용액(양수) */
  pointDiscount: number;
  /** 배송비(양수) */
  shippingFee: number;
  /** 전체 주문 라인 합계(비례 계산 기준) */
  totalLineAmount: number;
}

/** calcRefundPreview 결과 */
export interface RefundPreviewResult {
  /** 라인별 실제 환불액 (절사 + 잔액보정 적용) */
  lines: { id: string; refundAmount: number }[];
  /** 총 실제 환불액 */
  totalRefund: number;
  /** 배송비 포함 여부(전액환불 = true) */
  shippingIncluded: boolean;
}

/** calcReshippingPreview 입력 */
export interface ReshippingPreviewInput {
  /** 환불 후 잔여 주문 금액(원) */
  remainingOrderAmount: number;
  /** 기본 배송비(원, 기본 3000) */
  defaultShippingFee?: number;
  /** 무료배송 기준(원, 기본 50000) */
  freeShippingThreshold?: number;
}

/** calcReshippingPreview 결과 */
export interface ReshippingPreviewResult {
  /** 재청구 배송비(0이면 재청구 없음) */
  reshippingFee: number;
  /** 재청구 발생 여부 */
  required: boolean;
}

// ─── 순수 함수 ─────────────────────────────────────────────────────────────────

/**
 * 부분환불 비례배분 미리보기 (절사 + 잔액보정).
 *
 * BE calcProratedRefund 와 동일 알고리즘:
 *  각 라인 net = base - floor(coupon*base/total) - floor(point*base/total) - shippingShare
 *  shippingShare = 전액환불 시 0 (shippingFee 는 최대금액 라인에 별도 합산),
 *                  부분환불 시 floor(shipping*base/total)
 *  잔액보정: floor(targetTotal) 과 sumRaw 의 차이를 최대금액 라인에 합산.
 *
 * @throws Error 입력 라인 없음 / 음수 금액 / totalLineAmount <= 0
 */
export function calcRefundPreview(input: RefundPreviewInput): RefundPreviewResult {
  const { lines, couponDiscount, pointDiscount, shippingFee, totalLineAmount } = input;

  // ── 입력 검증 ──────────────────────────────────────────────────────────────
  if (!lines || lines.length === 0) {
    throw new Error("[refund-preview] 환불 대상 라인이 없습니다.");
  }
  for (const l of lines) {
    if (l.amount < 0) {
      throw new Error(`[refund-preview] 라인(${l.id}) 금액이 음수입니다: ${l.amount}`);
    }
  }
  if (couponDiscount < 0 || pointDiscount < 0 || shippingFee < 0) {
    throw new Error("[refund-preview] 할인액/배송비가 음수입니다.");
  }
  if (totalLineAmount <= 0) {
    throw new Error("[refund-preview] totalLineAmount 가 0 이하입니다.");
  }

  // ── 전액환불 여부 판단 ─────────────────────────────────────────────────────
  const refundLineAmount = lines.reduce((s, l) => s + l.amount, 0);
  const isFullRefund = refundLineAmount >= totalLineAmount;
  const shippingIncluded = isFullRefund;

  // ── 라인별 절사 환불액 계산 ───────────────────────────────────────────────
  const rawAmounts: number[] = lines.map((l) => {
    const base = l.amount;
    const couponShare = Math.floor((couponDiscount * base) / totalLineAmount);
    const pointShare = Math.floor((pointDiscount * base) / totalLineAmount);
    // 배송비: 전액환불이면 별도 합산 경로 사용, 부분환불이면 비례 포함
    const shippingShare = isFullRefund
      ? 0
      : Math.floor((shippingFee * base) / totalLineAmount);
    const net = base - couponShare - pointShare - shippingShare;
    return Math.max(0, net);
  });

  // ── 잔액보정 ──────────────────────────────────────────────────────────────
  let shippingBonus = isFullRefund ? shippingFee : 0;

  // 절사 없이 소수점 합계 (목표 총 환불액)
  const targetTotal = lines.reduce((s, l) => {
    const base = l.amount;
    const couponShare = (couponDiscount * base) / totalLineAmount;
    const pointShare = (pointDiscount * base) / totalLineAmount;
    const shippingShare = isFullRefund ? 0 : (shippingFee * base) / totalLineAmount;
    return s + Math.max(0, base - couponShare - pointShare - shippingShare);
  }, 0);

  const targetFloor = Math.floor(targetTotal) + (isFullRefund ? shippingFee : 0);
  const sumRaw = rawAmounts.reduce((s, v) => s + v, 0);
  const remainder = targetFloor - sumRaw;

  // 최대 금액 라인 인덱스
  let maxIdx = 0;
  for (let i = 1; i < rawAmounts.length; i++) {
    if (rawAmounts[i] > rawAmounts[maxIdx]) {
      maxIdx = i;
    }
  }

  // 최대 라인에 잔액 + 배송비 합산
  const finalAmounts = rawAmounts.map((v, i) => {
    let adj = v;
    if (i === maxIdx) {
      adj += remainder + shippingBonus;
      shippingBonus = 0;
    }
    return Math.max(0, adj);
  });

  const totalRefund = finalAmounts.reduce((s, v) => s + v, 0);

  return {
    lines: lines.map((l, i) => ({ id: l.id, refundAmount: finalAmounts[i] })),
    totalRefund,
    shippingIncluded,
  };
}

/**
 * 환불 후 잔여 주문액 기반 재청구 배송비 산출.
 *
 * remainingOrderAmount < 50,000 → defaultShippingFee(3,000) 재청구.
 * spec: t007_환불.md §1 F7
 */
export function calcReshippingPreview(
  input: ReshippingPreviewInput
): ReshippingPreviewResult {
  const {
    remainingOrderAmount,
    defaultShippingFee = 3000,
    freeShippingThreshold = 50000,
  } = input;

  if (remainingOrderAmount < 0) {
    throw new Error("[refund-preview] remainingOrderAmount 가 음수입니다.");
  }

  const required = remainingOrderAmount < freeShippingThreshold;
  return {
    reshippingFee: required ? defaultShippingFee : 0,
    required,
  };
}
