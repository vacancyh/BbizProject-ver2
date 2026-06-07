/**
 * QA-011 — d5 t007_세금계산서 (갭B tax-invoice 모듈) §V0-6 실HTTP 검증
 *
 *  - POST /admin/tax-invoices                     발급(사업자번호 검증)
 *  - POST /admin/tax-invoices/:id/transition      상태 전이(허용표)
 *  - GET  /admin/tax-invoices/:id                 조회
 *  - §V0-6: 발급 201 + 전이 200 엄격. 자기발견형 고객 생성 + DELETE 정리.
 */
import { test, expect } from "@playwright/test"

const API = "http://127.0.0.1:7001"

async function getAdminToken(request: any): Promise<string> {
  const res = await request.post(`${API}/auth/user/emailpass`, {
    data: { email: "admin@local.test", password: "djemalsdlqslek12!@" },
  })
  expect(res.status()).toBe(200)
  return (await res.json()).token as string
}

test.describe("QA-011 d5 세금계산서 — 발급/전이 실HTTP", () => {
  test("사업자번호 검증 발급 + 상태 전이(pending→issued→amended→cancelled)", async ({ request }) => {
    const token = await getAdminToken(request)
    const H = { authorization: `Bearer ${token}` }

    const stamp = Date.now()
    const createCust = await request.post(`${API}/admin/customers`, {
      headers: H,
      data: { email: `tax-test-${stamp}@local.test`, first_name: "세금", last_name: "테스트" },
    })
    expect([200, 201]).toContain(createCust.status())
    const customerId = (await createCust.json()).customer?.id as string

    try {
      // 잘못된 사업자번호(체크디짓 불일치) → 400
      const bad = await request.post(`${API}/admin/tax-invoices`, {
        headers: H,
        data: { customerId, bizNo: "1234567890", amount: 100000 },
      })
      expect(bad.status()).toBe(400)

      // 유효 사업자번호 → 201 pending
      const created = await request.post(`${API}/admin/tax-invoices`, {
        headers: H,
        data: { customerId, bizNo: "123-45-67891", amount: 100000, companyName: "테스트상사" },
      })
      expect(created.status()).toBe(201) // §V0-6
      const inv = (await created.json()).tax_invoice
      expect(inv.status).toBe("pending")
      expect(inv.biz_no).toBe("1234567891") // 정규화 확인
      const invId = inv.id as string

      // pending → issued
      const t1 = await request.post(`${API}/admin/tax-invoices/${invId}/transition`, {
        headers: H,
        data: { to: "issued" },
      })
      expect(t1.status()).toBe(200) // §V0-6
      expect((await t1.json()).tax_invoice.status).toBe("issued")

      // issued → amended
      const t2 = await request.post(`${API}/admin/tax-invoices/${invId}/transition`, {
        headers: H,
        data: { to: "amended" },
      })
      expect(t2.status()).toBe(200)

      // amended → cancelled
      const t3 = await request.post(`${API}/admin/tax-invoices/${invId}/transition`, {
        headers: H,
        data: { to: "cancelled" },
      })
      expect(t3.status()).toBe(200)

      // cancelled → issued (불가) → 400
      const t4 = await request.post(`${API}/admin/tax-invoices/${invId}/transition`, {
        headers: H,
        data: { to: "issued" },
      })
      expect(t4.status()).toBe(400)

      // 최종 조회 cancelled
      const fin = await request.get(`${API}/admin/tax-invoices/${invId}`, { headers: H })
      expect(fin.status()).toBe(200)
      expect((await fin.json()).tax_invoice.status).toBe("cancelled")
    } finally {
      await request.delete(`${API}/admin/customers/${customerId}`, { headers: H })
    }
  })
})
