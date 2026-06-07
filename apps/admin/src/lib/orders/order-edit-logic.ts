/**
 * 주문 수정(Order Edit) 순수 로직 (DB·req·React 의존 없음)
 *
 * Medusa 코어 order-edits 워크플로우(OrderChange → version 증가)를 FE 에서 호출하기 전,
 * "수정 가능 상태 판정 · 입력 검증 · 라인 변경 추출 · 차액 미리보기" 를 담당.
 * page.tsx 의 주문 수정 모달이 실제로 이 함수들을 소비한다(§V0-2 dead code 금지).
 *
 * spec: dag/d2_주문관리/t008_주문수정.md §3 S1·S2, §4 I1·I2·I3, §8 C1
 */

// ─── 입출력 타입 ───────────────────────────────────────────────────────────────

/** 수정 가능 판정 입력(주문 상태 일부) */
export interface OrderEditableInput {
  /** 주문 status (pending/completed/canceled 등) */
  status: string;
  /** 출고 상태 (not_fulfilled/partially_fulfilled/fulfilled/shipped/delivered) */
  fulfillment_status: string;
}

/** 라인 수량 변경 입력(모달에서 사용자가 조정한 값) */
export interface OrderLineQuantityEdit {
  /** order line item id */
  id: string;
  /** 현재 수량 */
  currentQuantity: number;
  /** 변경 후 수량(0 = 라인 삭제) */
  nextQuantity: number;
  /** 라인 단가(차액 계산용) */
  unitPrice: number;
}

/** 라인 변경 payload(코어 order-edits items 호출용) */
export interface OrderEditItemChange {
  /** order line item id */
  id: string;
  /** 변경 후 수량 */
  quantity: number;
}

/** 차액 미리보기 결과 */
export interface OrderEditDiffResult {
  /** 총 차액(양수=추가결제 필요, 음수=환불 필요, 0=동일) */
  diff: number;
  /** 추가결제 금액(diff > 0 일 때만) */
  additionalPayment: number;
  /** 환불 금액(diff < 0 일 때만, 양수로 표기) */
  refundAmount: number;
  /** 실제 변경된 라인 수 */
  changedLineCount: number;
}

/** 검증 결과 공통 형태 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// ─── 순수 함수 ─────────────────────────────────────────────────────────────────

/** 발송 전 출고 상태 화이트리스트 — 이 상태에서만 주문 수정 허용(spec §3 S1). */
const EDITABLE_FULFILLMENT_STATUS = new Set([
  "not_fulfilled",
  "partially_fulfilled",
]);

/**
 * 주문 수정 가능 여부 판정.
 *
 * 발송(shipping) 이후 또는 취소/완료 주문은 수정 불가(spec §3 S1, §8 C1).
 *  - status 가 canceled/completed → 불가
 *  - fulfillment_status 가 shipped/delivered/fulfilled → 불가(발송 이후)
 *
 * spec: t008_주문수정.md §3 S1(status ≤ preparing), §8 C1(발송 후 수정 시도 거부)
 */
export function canEditOrder(order: OrderEditableInput): boolean {
  if (!order) return false;
  if (order.status === "canceled" || order.status === "completed") return false;
  return EDITABLE_FULFILLMENT_STATUS.has(order.fulfillment_status);
}

/**
 * 이메일 형식 검증(spec §4 I2 — 선택, 입력 시 형식 검증).
 * 빈 값은 "수정 안 함"으로 보아 valid 처리(선택 입력이므로).
 */
export function validateOrderEditEmail(email: string | null | undefined): ValidationResult {
  if (email == null || email.trim() === "") {
    return { valid: true }; // 선택 입력 — 미입력은 수정 안 함
  }
  // 단순·실용 이메일 형식(로컬@도메인.tld)
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  return ok ? { valid: true } : { valid: false, reason: "이메일 형식이 올바르지 않습니다." };
}

/** 배송지 수정 입력(필수 필드 검증 대상) */
export interface ShippingAddressEditInput {
  first_name?: string | null;
  last_name?: string | null;
  address_1?: string | null;
  city?: string | null;
  postal_code?: string | null;
  phone?: string | null;
}

/**
 * 배송지 수정 입력 검증(spec §4 I3 — 선택, 입력 시 주소 형식).
 *
 * 배송지를 수정할 때는 수취인(이름)·주소1·도시가 필수.
 * 인자가 null/전체 빈값이면 "수정 안 함"으로 보아 valid.
 */
export function validateShippingAddressInput(
  addr: ShippingAddressEditInput | null | undefined
): ValidationResult {
  if (!addr) return { valid: true };
  const anyFilled =
    (addr.first_name ?? "").trim() !== "" ||
    (addr.last_name ?? "").trim() !== "" ||
    (addr.address_1 ?? "").trim() !== "" ||
    (addr.city ?? "").trim() !== "" ||
    (addr.postal_code ?? "").trim() !== "";
  if (!anyFilled) return { valid: true }; // 미입력 — 수정 안 함

  // 일부라도 입력했다면 필수 필드 충족 요구
  const hasName =
    (addr.first_name ?? "").trim() !== "" || (addr.last_name ?? "").trim() !== "";
  if (!hasName) return { valid: false, reason: "수취인명을 입력하세요." };
  if ((addr.address_1 ?? "").trim() === "")
    return { valid: false, reason: "주소를 입력하세요." };
  if ((addr.city ?? "").trim() === "")
    return { valid: false, reason: "도시를 입력하세요." };
  return { valid: true };
}

/**
 * 라인 수량 변경 추출 — 변경된 라인만 코어 order-edits items payload 로 변환.
 *
 * nextQuantity 가 currentQuantity 와 다른 라인만 반환(동일 라인 제외).
 * nextQuantity 0 = 라인 삭제(quantity 0 으로 전달).
 *
 * @throws Error nextQuantity 가 음수
 * spec: t008_주문수정.md §2 step2(OrderChange 생성), §6 API1
 */
export function buildItemQuantityChanges(
  edits: OrderLineQuantityEdit[]
): OrderEditItemChange[] {
  if (!edits || edits.length === 0) return [];
  for (const e of edits) {
    if (e.nextQuantity < 0) {
      throw new Error(`[order-edit] 라인(${e.id}) 수량이 음수입니다: ${e.nextQuantity}`);
    }
  }
  return edits
    .filter((e) => e.nextQuantity !== e.currentQuantity)
    .map((e) => ({ id: e.id, quantity: e.nextQuantity }));
}

/**
 * 라인 수량 변경 차액 미리보기(추가결제/환불 판정).
 *
 * diff = Σ (nextQuantity - currentQuantity) * unitPrice
 *  - diff > 0 → 추가결제, diff < 0 → 환불, 0 → 변동 없음
 *
 * spec: t008_주문수정.md §1(차액 발생 시 추가결제/환불 연동), §2 step2(차액 표시)
 */
export function calcOrderEditDiff(edits: OrderLineQuantityEdit[]): OrderEditDiffResult {
  if (!edits || edits.length === 0) {
    return { diff: 0, additionalPayment: 0, refundAmount: 0, changedLineCount: 0 };
  }
  for (const e of edits) {
    if (e.nextQuantity < 0) {
      throw new Error(`[order-edit] 라인(${e.id}) 수량이 음수입니다: ${e.nextQuantity}`);
    }
    if (e.unitPrice < 0) {
      throw new Error(`[order-edit] 라인(${e.id}) 단가가 음수입니다: ${e.unitPrice}`);
    }
  }
  let diff = 0;
  let changedLineCount = 0;
  for (const e of edits) {
    const qtyDelta = e.nextQuantity - e.currentQuantity;
    if (qtyDelta !== 0) {
      diff += qtyDelta * e.unitPrice;
      changedLineCount += 1;
    }
  }
  return {
    diff,
    additionalPayment: diff > 0 ? diff : 0,
    refundAmount: diff < 0 ? -diff : 0,
    changedLineCount,
  };
}
