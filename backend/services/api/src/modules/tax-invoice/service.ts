/**
 * 세금계산서 모듈 서비스 — 사업자번호 검증 후 발급 + 상태 전이.
 *
 * 주요 메서드:
 *  - createInvoice(input)                      = 사업자번호 검증 후 pending 발급
 *  - transition(invoiceId, to)                 = 상태 전이(허용표 검증)
 *  - getInvoice(invoiceId)                     = 1건 조회
 *  - listByCustomer(customerId)                = 고객별 목록
 *  - linkToPayout(invoiceId, payoutId)         = 정산 기간 id 연결(d7 링크)
 *  - unlinkFromPayout(invoiceId)               = 정산 기간 연결 해제
 *  - listByPayout(payoutId)                    = 정산 id 로 연결된 세금계산서 목록
 *
 * 검증/전이 룰은 logic.ts(순수함수) 위임(§V0 단일 진실).
 */
import { MedusaService } from "@medusajs/framework/utils"
import TaxInvoice from "./models/tax-invoice"
import {
  TaxInvoiceStatus,
  validateBizNo,
  normalizeBizNo,
  canTransitionTaxInvoice,
} from "./logic"
import { encryptPii, decryptPii } from "./crypto"

export type CreateInvoiceInput = {
  customerId: string
  bizNo: string
  amount: number
  companyName?: string | null
  orderId?: string | null
  /** 발급과 동시에 정산 기간 연결(선택). */
  payoutId?: string | null
}

class TaxInvoiceModuleService extends MedusaService({
  TaxInvoice,
}) {
  /** 사업자번호 검증 후 pending 발급. */
  async createInvoice(input: CreateInvoiceInput): Promise<any> {
    const check = validateBizNo(input.bizNo)
    if (!check.valid) {
      throw new Error(`[tax-invoice] ${check.error}`)
    }
    const [row] = await this.createTaxInvoices([
      {
        customer_id: input.customerId,
        order_id: input.orderId ?? null,
        payout_id: input.payoutId ?? null,
        // H5: 사업자번호 at-rest 암호화(검증은 평문으로 이미 수행). 검증 통과 = 항상 non-empty
        biz_no: encryptPii(normalizeBizNo(input.bizNo)) as string,
        company_name: input.companyName ?? null,
        amount: input.amount,
        status: "pending",
      },
    ])
    return this.toView(row)
  }

  /** 상태 전이(허용표 검증). */
  async transition(invoiceId: string, to: TaxInvoiceStatus): Promise<any> {
    const ex = await this.getInvoice(invoiceId)
    if (!ex) throw new Error(`[tax-invoice] 존재하지 않는 세금계산서: ${invoiceId}`)
    const from = ex.status as TaxInvoiceStatus
    if (!canTransitionTaxInvoice(from, to)) {
      throw new Error(`[tax-invoice] 허용되지 않는 상태 전이: ${from} → ${to}`)
    }
    const [row] = await this.updateTaxInvoices([{ id: invoiceId, status: to }])
    return row
  }

  /** amount numeric→string 방지 정규화(§V0) + biz_no 복호화(H5, 레거시 평문 호환). */
  private toView(row: any): any {
    return row ? { ...row, amount: Number(row.amount), biz_no: decryptPii(row.biz_no) } : row
  }

  /** 1건 조회. */
  async getInvoice(invoiceId: string): Promise<any | null> {
    const rows = await this.listTaxInvoices({ id: invoiceId })
    return rows.length ? this.toView(rows[0]) : null
  }

  /** 고객별 목록(최신순). */
  async listByCustomer(customerId: string): Promise<any[]> {
    const rows = await this.listTaxInvoices({ customer_id: customerId }, { order: { created_at: "DESC" } })
    return rows.map((r: any) => this.toView(r))
  }

  /**
   * 세금계산서 → 정산 기간 링크(d7 링크).
   * cancelled 상태 세금계산서는 링크 금지.
   */
  async linkToPayout(invoiceId: string, payoutId: string): Promise<any> {
    const ex = await this.getInvoice(invoiceId)
    if (!ex) throw new Error(`[tax-invoice] 존재하지 않는 세금계산서: ${invoiceId}`)
    if (ex.status === "cancelled") {
      throw new Error(`[tax-invoice] 취소된 세금계산서는 정산 기간에 연결할 수 없습니다.`)
    }
    const [row] = await this.updateTaxInvoices([{ id: invoiceId, payout_id: payoutId }])
    return this.toView(row)
  }

  /** 세금계산서의 정산 기간 연결 해제. */
  async unlinkFromPayout(invoiceId: string): Promise<any> {
    const ex = await this.getInvoice(invoiceId)
    if (!ex) throw new Error(`[tax-invoice] 존재하지 않는 세금계산서: ${invoiceId}`)
    const [row] = await this.updateTaxInvoices([{ id: invoiceId, payout_id: null }])
    return this.toView(row)
  }

  /** 정산 기간 id 로 연결된 세금계산서 목록(최신순). */
  async listByPayout(payoutId: string): Promise<any[]> {
    const rows = await this.listTaxInvoices(
      { payout_id: payoutId },
      { order: { created_at: "DESC" } }
    )
    return rows.map((r: any) => this.toView(r))
  }
}

export default TaxInvoiceModuleService
