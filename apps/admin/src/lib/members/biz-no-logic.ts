/**
 * 사업자등록번호 검증 순수 로직 모듈 (d5 t007_세금계산서 spec §9 — 갭B)
 *
 * - 순수 함수만 → vitest 단위 테스트 가능.
 * - 백엔드 영속화(tax_invoice 모델·발급/정정/취소 route·정산 연동)는 갭B 신규 모듈 영역으로 deferred.
 *   본 모듈은 사업자번호 형식/체크디짓 검증 + 세금계산서 상태 전이 룰만 제공.
 *
 * 한국 사업자등록번호(10자리) 표준 체크섬:
 *   가중치 [1,3,7,1,3,7,1,3,5], 9번째 자리는 ×5 후 십의자리 보정,
 *   검증코드 = (10 - (합 % 10)) % 10 == 10번째 자리.
 */

const BIZ_NO_WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5];

/** 하이픈/공백 제거 후 숫자 10자리만 추출. */
export function normalizeBizNo(raw: string): string {
  return (raw ?? "").replace(/[^0-9]/g, "");
}

/**
 * 사업자등록번호 유효성 검증 (형식 + 체크디짓)
 * @returns { valid, error? }
 */
export function validateBizNo(raw: string): { valid: boolean; error?: string } {
  const digits = normalizeBizNo(raw);
  if (digits.length !== 10) {
    return { valid: false, error: "사업자등록번호는 숫자 10자리여야 합니다" };
  }
  const nums = digits.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += nums[i] * BIZ_NO_WEIGHTS[i];
  }
  // 9번째(index 8) 자리 ×5 의 십의 자리 보정
  sum += Math.floor((nums[8] * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  if (check !== nums[9]) {
    return { valid: false, error: "사업자등록번호 체크디짓 불일치" };
  }
  return { valid: true };
}

/** 세금계산서 상태 (스펙: 신청→발급→정정/취소) */
export const TAX_INVOICE_STATUSES = ["pending", "issued", "amended", "cancelled"] as const;
export type TaxInvoiceStatus = (typeof TAX_INVOICE_STATUSES)[number];

/** 상태 전이 허용표 — pending→issued, issued→amended/cancelled, amended→cancelled. */
const TAX_INVOICE_TRANSITIONS: Record<TaxInvoiceStatus, TaxInvoiceStatus[]> = {
  pending: ["issued"],
  issued: ["amended", "cancelled"],
  amended: ["cancelled", "amended"],
  cancelled: [],
};

/** 세금계산서 상태 전이 가능 여부. */
export function canTransitionTaxInvoice(from: TaxInvoiceStatus, to: TaxInvoiceStatus): boolean {
  return (TAX_INVOICE_TRANSITIONS[from] ?? []).includes(to);
}
