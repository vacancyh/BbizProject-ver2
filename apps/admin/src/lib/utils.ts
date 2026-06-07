import { clsx, type ClassValue } from "clsx";

/** className 조건부 결합 헬퍼 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** 통화 표기 — 한국 단독몰: KRW 고정 표기(두번째 인자는 호환용으로 무시). */
export function formatCurrency(amount: number, _currencyCode?: string): string {
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("ko-KR")}원`;
  }
}
