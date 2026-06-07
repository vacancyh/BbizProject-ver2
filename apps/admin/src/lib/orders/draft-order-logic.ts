/**
 * 수기 주문(Draft Order) 순수 로직 (DB·req·React 의존 없음)
 *
 * Medusa 코어 draft-orders 워크플로우(is_draft_order=true → convert-to-order)를
 * FE 에서 호출하기 전 "입력 검증 · 금액 계산 · 전환 가능 판정" 을 담당.
 * page.tsx 의 수기 주문 모달이 실제로 이 함수들을 소비한다(§V0-2 dead code 금지).
 *
 * spec: dag/d2_주문관리/t009_수기주문생성.md §3 S1·S2·S3, §4 I1·I2·I3
 */

// ─── 입출력 타입 ───────────────────────────────────────────────────────────────

/** 수기 주문 라인(모달 입력) */
export interface DraftOrderLineInput {
  /** variant id(상품 변형) */
  variant_id: string;
  /** 수량 */
  quantity: number;
  /** 단가(원) — 금액 계산용 */
  unit_price: number;
}

/** validateDraftOrderInput 입력 */
export interface DraftOrderInput {
  /** 고객 이메일(필수, spec I1) */
  email: string;
  /** 리전 id(통화/세율 결정, 필수) */
  region_id: string;
  /** 주문 라인(필수 ≥1, spec I2) */
  items: DraftOrderLineInput[];
  /** 배송지(필수, spec I3) */
  shipping_address?: {
    first_name?: string | null;
    address_1?: string | null;
    city?: string | null;
  } | null;
}

/** 검증 결과 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/** 전환 가능 판정 입력(draft 상태 일부) */
export interface DraftConvertInput {
  /** is_draft_order 플래그 */
  is_draft_order: boolean;
  /** 라인 수 */
  itemCount: number;
}

// ─── 순수 함수 ─────────────────────────────────────────────────────────────────

/** 단순·실용 이메일 형식 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * 수기 주문 생성 입력 검증.
 *
 * 고객 이메일(형식) · 리전 · 상품 라인(≥1, 수량>0) · 배송지(이름/주소1/도시) 필수.
 * spec: t009_수기주문생성.md §4 I1(고객) I2(상품/수량) I3(배송지)
 */
export function validateDraftOrderInput(input: DraftOrderInput): ValidationResult {
  if (!input) return { valid: false, reason: "입력이 없습니다." };

  // I1 — 고객 이메일
  if (!input.email || input.email.trim() === "") {
    return { valid: false, reason: "고객(이메일)은 필수입니다." };
  }
  if (!isValidEmail(input.email)) {
    return { valid: false, reason: "이메일 형식이 올바르지 않습니다." };
  }

  // 리전
  if (!input.region_id || input.region_id.trim() === "") {
    return { valid: false, reason: "리전을 선택하세요." };
  }

  // I2 — 상품/수량
  if (!input.items || input.items.length === 0) {
    return { valid: false, reason: "상품을 1개 이상 추가하세요." };
  }
  for (const it of input.items) {
    if (!it.variant_id || it.variant_id.trim() === "") {
      return { valid: false, reason: "상품(변형)을 선택하세요." };
    }
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
      return { valid: false, reason: "수량은 1 이상이어야 합니다." };
    }
    if (!Number.isFinite(it.unit_price) || it.unit_price < 0) {
      return { valid: false, reason: "단가가 올바르지 않습니다." };
    }
  }

  // I3 — 배송지(이름/주소1/도시)
  const addr = input.shipping_address;
  if (!addr) {
    return { valid: false, reason: "배송지를 입력하세요." };
  }
  if ((addr.first_name ?? "").trim() === "") {
    return { valid: false, reason: "수취인명을 입력하세요." };
  }
  if ((addr.address_1 ?? "").trim() === "") {
    return { valid: false, reason: "주소를 입력하세요." };
  }
  if ((addr.city ?? "").trim() === "") {
    return { valid: false, reason: "도시를 입력하세요." };
  }

  return { valid: true };
}

/**
 * 수기 주문 합계 계산 — Σ(unit_price * quantity).
 *
 * @throws Error 라인 없음 / 음수 단가·수량
 * spec: t009_수기주문생성.md §2 step2(금액 계산)
 */
export function calcDraftOrderTotal(items: DraftOrderLineInput[]): number {
  if (!items || items.length === 0) {
    throw new Error("[draft-order] 라인이 없습니다.");
  }
  let total = 0;
  for (const it of items) {
    if (it.quantity < 0) {
      throw new Error(`[draft-order] 수량이 음수입니다: ${it.quantity}`);
    }
    if (it.unit_price < 0) {
      throw new Error(`[draft-order] 단가가 음수입니다: ${it.unit_price}`);
    }
    total += it.unit_price * it.quantity;
  }
  return total;
}

/**
 * 수기 주문 → 정식 주문 전환 가능 판정.
 *
 * draft 상태(is_draft_order=true) + 라인 ≥1 일 때만 전환 가능.
 * spec: t009_수기주문생성.md §3 S3(결제 완료 → order 전환), §2 step3
 */
export function canConvertDraftOrder(draft: DraftConvertInput): boolean {
  if (!draft) return false;
  if (!draft.is_draft_order) return false; // 이미 정식 주문
  return draft.itemCount >= 1;
}
