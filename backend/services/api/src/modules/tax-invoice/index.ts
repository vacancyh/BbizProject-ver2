/**
 * 세금계산서 모듈 정의 (d5 t007_세금계산서 갭B 신규 모듈).
 *
 * 역할: 사업자번호 검증 + 세금계산서 발급/정정/취소 상태 관리.
 * 가드레일: Medusa core(customer/order) 미수정 — text 느슨 연결.
 */
import { Module } from "@medusajs/framework/utils"
import TaxInvoiceModuleService from "./service"

export const TAX_INVOICE_MODULE = "taxInvoice"

export default Module(TAX_INVOICE_MODULE, {
  service: TaxInvoiceModuleService,
})
