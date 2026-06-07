/**
 * 세금계산서 모듈 단위 테스트 (d5 t007 — production 직접 검증)
 */
import {
  normalizeBizNo,
  validateBizNo,
  canTransitionTaxInvoice,
  TAX_INVOICE_STATUSES,
} from "../logic"

import * as fs from "fs"
import * as path from "path"

describe("normalizeBizNo / validateBizNo: 사업자번호 체크섬", () => {
  test("하이픈/공백 제거", () => {
    expect(normalizeBizNo("123-45-67891")).toBe("1234567891")
    expect(normalizeBizNo(" 123 45 67891 ")).toBe("1234567891")
  })
  test("유효 사업자번호(체크디짓 일치) = valid", () => {
    expect(validateBizNo("1234567891").valid).toBe(true)
    expect(validateBizNo("123-45-67891").valid).toBe(true)
  })
  test("체크디짓 불일치 = invalid", () => {
    expect(validateBizNo("1234567890").valid).toBe(false)
  })
  test("10자리 아니면 invalid", () => {
    expect(validateBizNo("12345").valid).toBe(false)
    expect(validateBizNo("12345678901").valid).toBe(false)
  })
})

describe("canTransitionTaxInvoice: 상태 전이표", () => {
  test("pending→issued 허용", () => {
    expect(canTransitionTaxInvoice("pending", "issued")).toBe(true)
  })
  test("issued→amended/cancelled 허용", () => {
    expect(canTransitionTaxInvoice("issued", "amended")).toBe(true)
    expect(canTransitionTaxInvoice("issued", "cancelled")).toBe(true)
  })
  test("amended→cancelled 허용", () => {
    expect(canTransitionTaxInvoice("amended", "cancelled")).toBe(true)
  })
  test("cancelled 에서는 전이 불가(종료 상태)", () => {
    expect(canTransitionTaxInvoice("cancelled", "issued")).toBe(false)
    expect(canTransitionTaxInvoice("cancelled", "amended")).toBe(false)
  })
  test("pending→cancelled 직행 불가(발급 전)", () => {
    expect(canTransitionTaxInvoice("pending", "cancelled")).toBe(false)
  })
  test("TAX_INVOICE_STATUSES 4종", () => {
    expect(TAX_INVOICE_STATUSES).toEqual(["pending", "issued", "amended", "cancelled"])
  })
})

describe("service.ts / route.ts 구조 검증", () => {
  const svc = fs.readFileSync(path.resolve(__dirname, "../service.ts"), "utf-8")
  const createRoute = fs.readFileSync(
    path.resolve(__dirname, "../../../api/admin/tax-invoices/route.ts"),
    "utf-8"
  )
  const transRoute = fs.readFileSync(
    path.resolve(__dirname, "../../../api/admin/tax-invoices/[id]/transition/route.ts"),
    "utf-8"
  )
  test("service 가 logic 룰 import(validateBizNo/canTransitionTaxInvoice)", () => {
    expect(svc).toContain("validateBizNo")
    expect(svc).toContain("canTransitionTaxInvoice")
    expect(svc).toContain("./logic")
  })
  test("createInvoice/transition 메서드 존재", () => {
    expect(svc).toContain("createInvoice")
    expect(svc).toContain("transition")
  })
  test("create route 가 201 발급", () => {
    expect(createRoute).toContain("201")
  })
  test("transition route 가 to 검증(400)", () => {
    expect(transRoute).toContain("400")
    expect(transRoute).toContain("TAX_INVOICE_STATUSES")
  })
})
