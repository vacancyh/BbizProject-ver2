/**
 * 클레임 접수 순수 로직 모듈 (t006_클레임 spec §3, §4, §8)
 *
 * - DOM/fetch/React 없는 순수 함수만 포함 → vitest 단위 테스트 가능.
 * - production 연결:
 *   apps/admin/src/app/(admin)/orders/page.tsx 가
 *   canRequestClaim / validateClaimInput / resolveClaimOutcome 을 실제 호출.
 */

// ─── 타입 ────────────────────────────────────────────────────────────────────

/** 클레임 유형 (코어 Medusa claim.type 과 1:1) */
export type ClaimType = "replace" | "refund";

/** 클레임 입력 검증에 사용하는 단일 항목 */
export type ClaimItem = {
  /** order line item id */
  id: string;
  /** 클레임 수량 */
  quantity: number;
};

/** validateClaimInput 에 전달하는 입력값 구조 */
export type ClaimInput = {
  /** 클레임 유형 (필수) */
  type: ClaimType | string;
  /** 클레임 대상 라인 (1개 이상 필수) */
  items: ClaimItem[];
  /**
   * 증빙 파일명 또는 파일 참조 (d12 file 연동 전 — 필드 존재/비어있지 않음 검증만 수행).
   * spec §4 I2: 증빙 필수, §8 C1: 증빙 없는 불량 주장 시 보류.
   */
  evidence?: string | null;
};

/** validateClaimInput 반환값 */
export type ClaimValidationResult = {
  /** 유효 여부 */
  valid: boolean;
  /** 유효하지 않을 경우 사유 */
  reason?: string;
  /**
   * 보류 여부 (spec §8 C1 — 증빙 없는 불량 주장 = 운영 검토 보류).
   * valid=false + pending=true: 즉시 거부가 아닌 보류 상태.
   */
  pending?: boolean;
};

/** resolveClaimOutcome 반환값 (spec §3 S2/S3 후속 안내) */
export type ClaimOutcome = {
  /** 후속 처리 유형 */
  action: "replace_dispatch" | "refund_link" | "none";
  /** UI 안내 메시지 */
  message: string;
};

// ─── 핵심 함수 ───────────────────────────────────────────────────────────────

/**
 * 클레임 접수 가능 여부 판정 (spec §3 S1)
 *
 * - fulfillment_status === "delivered" 이고 주문 취소 아님 → true.
 * - 배송 완료(delivered) 이전에는 클레임 접수 불가.
 *
 * @param fulfillmentStatus  주문 배송 상태
 * @param orderStatus  주문 상태
 */
export function canRequestClaim(
  fulfillmentStatus: string,
  orderStatus: string
): boolean {
  return fulfillmentStatus === "delivered" && orderStatus !== "canceled";
}

/**
 * 클레임 입력값 검증 순수함수 (spec §4 I1/I2/I3, §8 C1)
 *
 * 검증 순서:
 * 1. 유형 필수 (replace | refund) — I1
 * 2. 라인 1개 이상 + 수량 ≥ 1 — I3
 * 3. 증빙 필수 — I2 / §8 C1(증빙 없으면 보류 처리)
 *
 * @param input  ClaimInput 구조
 */
export function validateClaimInput(input: ClaimInput): ClaimValidationResult {
  // I1: 유형 필수
  if (!input.type || (input.type !== "replace" && input.type !== "refund")) {
    return { valid: false, reason: "유형 필수: replace 또는 refund 를 선택하세요." };
  }

  // I3: 라인 1개 이상
  if (!input.items || input.items.length === 0) {
    return { valid: false, reason: "클레임 대상 라인을 1개 이상 선택하세요." };
  }
  const hasInvalidQuantity = input.items.some(
    (it) => !Number.isFinite(it.quantity) || it.quantity < 1
  );
  if (hasInvalidQuantity) {
    return { valid: false, reason: "모든 클레임 항목의 수량은 1 이상이어야 합니다." };
  }

  // I2 / §8 C1: 증빙 필수 — 없으면 보류(valid=false, pending=true)
  if (!input.evidence || String(input.evidence).trim() === "") {
    return {
      valid: false,
      reason: "증빙 이미지를 첨부하세요. 증빙 없는 클레임은 운영 검토 보류 처리됩니다.",
      pending: true,
    };
  }

  return { valid: true };
}

/**
 * 클레임 유형별 후속 안내 판정 (spec §3 S2/S3)
 *
 * - replace → 재고 확인 필요 안내 (대체 발송)
 * - refund  → t007 환불 연동 안내
 * - 그 외    → none
 *
 * @param type  클레임 유형
 */
export function resolveClaimOutcome(type: ClaimType | string): ClaimOutcome {
  if (type === "replace") {
    return {
      action: "replace_dispatch",
      message: "대체 발송이 접수되었습니다. 재고 확인 후 신규 배송이 진행됩니다.",
    };
  }
  if (type === "refund") {
    return {
      action: "refund_link",
      message: "환불 클레임이 접수되었습니다. 환불 처리(t007)가 연동됩니다.",
    };
  }
  return { action: "none", message: "" };
}
