/**
 * 세금계산서 API 클라이언트 — tax-invoice 갭B 백엔드 모듈 호출/래핑.
 *
 * 백엔드:
 *  - POST   /admin/tax-invoices                     신규 발급
 *  - GET    /admin/tax-invoices/:id                 1건 조회
 *  - POST   /admin/tax-invoices/:id/transition      상태 전이
 *  - POST   /admin/tax-invoices/:id/link-payout     정산 기간 연결 (d7 링크)
 *  - DELETE /admin/tax-invoices/:id/link-payout     정산 기간 연결 해제
 *  - GET    /admin/settlement/periods/:key/tax-invoices  기간별 세금계산서 목록
 *
 * d7 정산관리 연동: payout_id 로 정산 기간 ↔ 세금계산서 느슨 연결.
 */
import { apiFetch } from "./client";

/** 세금계산서 상태 */
export type TaxInvoiceStatus = "pending" | "issued" | "amended" | "cancelled";

/** 세금계산서 1행(백엔드 tax_invoice 모델 정합). */
export type TaxInvoice = {
  id: string;
  customer_id: string;
  order_id: string | null;
  /** 연결된 정산 기간 id (settlement_payout.id) — null 이면 미연결. */
  payout_id: string | null;
  biz_no: string;
  company_name: string | null;
  amount: number;
  status: TaxInvoiceStatus;
  created_at?: string;
  updated_at?: string;
};

/** 발급 입력. */
export type CreateInvoiceInput = {
  customerId: string;
  bizNo: string;
  amount: number;
  companyName?: string;
  orderId?: string;
  /** 발급과 동시에 정산 기간 연결(선택). */
  payoutId?: string;
};

/** 세금계산서 신규 발급(pending). */
export function createTaxInvoice(
  input: CreateInvoiceInput
): Promise<{ tax_invoice: TaxInvoice }> {
  return apiFetch("/admin/tax-invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** 세금계산서 1건 조회(없으면 404 → throw). */
export function getTaxInvoice(id: string): Promise<{ tax_invoice: TaxInvoice }> {
  return apiFetch(`/admin/tax-invoices/${encodeURIComponent(id)}`);
}

/** 상태 전이 (issued / amended / cancelled). */
export function transitionTaxInvoice(
  id: string,
  to: TaxInvoiceStatus
): Promise<{ tax_invoice: TaxInvoice }> {
  return apiFetch(`/admin/tax-invoices/${encodeURIComponent(id)}/transition`, {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

/**
 * 정산 기간 id 연결 (d7 링크).
 * 취소 상태 세금계산서는 백엔드 400 반환.
 */
export function linkTaxInvoiceToPayout(
  invoiceId: string,
  payoutId: string
): Promise<{ tax_invoice: TaxInvoice }> {
  return apiFetch(
    `/admin/tax-invoices/${encodeURIComponent(invoiceId)}/link-payout`,
    {
      method: "POST",
      body: JSON.stringify({ payoutId }),
    }
  );
}

/** 정산 기간 연결 해제. */
export function unlinkTaxInvoiceFromPayout(
  invoiceId: string
): Promise<{ tax_invoice: TaxInvoice }> {
  return apiFetch(
    `/admin/tax-invoices/${encodeURIComponent(invoiceId)}/link-payout`,
    { method: "DELETE" }
  );
}

/**
 * 정산 기간별 세금계산서 목록 — period_key(예: "2026-05")로 조회.
 * 연결된 세금계산서 없으면 tax_invoices = [].
 */
export function listTaxInvoicesByPeriod(periodKey: string): Promise<{
  period_key: string;
  payout_id: string;
  tax_invoices: TaxInvoice[];
  count: number;
}> {
  return apiFetch(
    `/admin/settlement/periods/${encodeURIComponent(periodKey)}/tax-invoices`
  );
}
