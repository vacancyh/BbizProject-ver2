/**
 * 사업자등록번호/세금계산서 순수 로직 모듈 (백엔드 정본) — DB 의존 없음. (d5 t007 갭B)
 *
 * ★ 단일 진실(§V0): 동일 룰이 admin 앱(apps/admin/src/lib/members/biz-no-logic.ts)에도 존재.
 *   책임 레이어 분리(admin=화면, backend=영속 권위). shared 통합은 별도 deferred.
 *
 * 한국 사업자등록번호(10자리) 표준 체크섬: 가중치 [1,3,7,1,3,7,1,3,5],
 *   9번째 자리 ×5 후 십의자리 보정, 검증코드 = (10 - (합%10))%10 == 10번째 자리.
 */

const BIZ_NO_WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5]

/** 하이픈/공백 제거 후 숫자 10자리만 추출. */
export function normalizeBizNo(raw: string): string {
  return (raw ?? "").replace(/[^0-9]/g, "")
}

/** 사업자등록번호 유효성 검증 (형식 + 체크디짓) */
export function validateBizNo(raw: string): { valid: boolean; error?: string } {
  const digits = normalizeBizNo(raw)
  if (digits.length !== 10) {
    return { valid: false, error: "사업자등록번호는 숫자 10자리여야 합니다" }
  }
  const nums = digits.split("").map(Number)
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += nums[i] * BIZ_NO_WEIGHTS[i]
  }
  sum += Math.floor((nums[8] * 5) / 10)
  const check = (10 - (sum % 10)) % 10
  if (check !== nums[9]) {
    return { valid: false, error: "사업자등록번호 체크디짓 불일치" }
  }
  return { valid: true }
}

/** 세금계산서 상태 (신청→발급→정정/취소) */
export const TAX_INVOICE_STATUSES = ["pending", "issued", "amended", "cancelled"] as const
export type TaxInvoiceStatus = (typeof TAX_INVOICE_STATUSES)[number]

/** 상태 전이 허용표 — pending→issued, issued→amended/cancelled, amended→cancelled/amended. */
const TAX_INVOICE_TRANSITIONS: Record<TaxInvoiceStatus, TaxInvoiceStatus[]> = {
  pending: ["issued"],
  issued: ["amended", "cancelled"],
  amended: ["cancelled", "amended"],
  cancelled: [],
}

/** 세금계산서 상태 전이 가능 여부. */
export function canTransitionTaxInvoice(from: TaxInvoiceStatus, to: TaxInvoiceStatus): boolean {
  return (TAX_INVOICE_TRANSITIONS[from] ?? []).includes(to)
}
