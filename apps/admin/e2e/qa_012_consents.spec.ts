/**
 * QA-012 — d5 t008_동의이력 (갭B customer-consent 모듈) §V0-6 실HTTP 검증
 *
 *  - POST /admin/consents/customers/:id   동의/철회 기록
 *  - GET  /admin/consents/customers/:id   채널별 현재 동의 + 재확인 필요
 *  - §V0-6: 기록 성공경로 200 엄격. 최신 기록 우선(동의→철회) 반영 확인. 자기발견형 정리.
 */
import { test, expect } from "@playwright/test"

const API = process.env.MEDUSA_API ?? "http://127.0.0.1:9000"

async function getAdminToken(request: any): Promise<string> {
  const res = await request.post(`${API}/auth/user/emailpass`, {
    data: { email: "admin@local.test", password: "djemalsdlqslek12!@" },
  })
  expect(res.status()).toBe(200)
  return (await res.json()).token as string
}

test.describe("QA-012 d5 동의이력 — 동의/철회 최신 반영 실HTTP", () => {
  test("동의 기록 + 철회 후 최신 상태 반영", async ({ request }) => {
    const token = await getAdminToken(request)
    const H = { authorization: `Bearer ${token}` }

    const stamp = Date.now()
    const createCust = await request.post(`${API}/admin/customers`, {
      headers: H,
      data: { email: `cnst-test-${stamp}@local.test`, first_name: "동의", last_name: "테스트" },
    })
    expect([200, 201]).toContain(createCust.status())
    const customerId = (await createCust.json()).customer?.id as string

    try {
      // 초기: 전부 미동의
      const init = await request.get(`${API}/admin/consents/customers/${customerId}`, { headers: H })
      expect(init.status()).toBe(200)
      expect((await init.json()).consents.marketing).toBe(false)

      // 잘못된 채널 → 400
      const bad = await request.post(`${API}/admin/consents/customers/${customerId}`, {
        headers: H,
        data: { channel: "invalid_ch", agreed: true },
      })
      expect(bad.status()).toBe(400)

      // 마케팅 동의 → 200
      const c1 = await request.post(`${API}/admin/consents/customers/${customerId}`, {
        headers: H,
        data: { channel: "marketing", agreed: true },
      })
      expect(c1.status()).toBe(200) // §V0-6

      const g1 = await request.get(`${API}/admin/consents/customers/${customerId}`, { headers: H })
      expect((await g1.json()).consents.marketing).toBe(true)

      // 마케팅 철회 → 200 → 최신 반영(false)
      const c2 = await request.post(`${API}/admin/consents/customers/${customerId}`, {
        headers: H,
        data: { channel: "marketing", agreed: false },
      })
      expect(c2.status()).toBe(200) // §V0-6

      const g2 = await request.get(`${API}/admin/consents/customers/${customerId}`, { headers: H })
      const g2Body = await g2.json()
      expect(g2Body.consents.marketing).toBe(false) // 최신=철회
      expect(Array.isArray(g2Body.needs_reconsent)).toBe(true)
    } finally {
      await request.delete(`${API}/admin/customers/${customerId}`, { headers: H })
    }
  })
})
