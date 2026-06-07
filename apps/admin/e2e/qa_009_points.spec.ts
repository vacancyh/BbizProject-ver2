/**
 * QA-009 — d5 t005_포인트 (갭B customer-point 모듈) §V0-6 실HTTP 검증
 *
 *  - GET  /admin/points/customers/:id            (잔액+원장)
 *  - POST /admin/points/customers/:id/earn       (적립: points 직접 / amount×rate)
 *  - POST /admin/points/customers/:id/redeem     (사용: 잔액검증)
 *  - §V0-6: 적립/사용 성공경로 200 엄격. 자기발견형 고객 생성 + DELETE 정리.
 */
import { test, expect } from "@playwright/test"

const API = "http://127.0.0.1:7001"

async function getAdminToken(request: any): Promise<string> {
  const res = await request.post(`${API}/auth/user/emailpass`, {
    data: { email: "admin@local.test", password: "djemalsdlqslek12!@" },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  return body.token as string
}

test.describe("QA-009 d5 포인트 — 적립/사용/잔액 실HTTP", () => {
  test("적립(직접/구매) + 사용(잔액검증) + 초과 거부", async ({ request }) => {
    const token = await getAdminToken(request)
    const H = { authorization: `Bearer ${token}` }

    const stamp = Date.now()
    const createCust = await request.post(`${API}/admin/customers`, {
      headers: H,
      data: { email: `pt-test-${stamp}@local.test`, first_name: "포인트", last_name: "테스트" },
    })
    expect([200, 201]).toContain(createCust.status())
    const customerId = (await createCust.json()).customer?.id as string
    expect(typeof customerId).toBe("string")

    try {
      // 초기 잔액 0
      const init = await request.get(`${API}/admin/points/customers/${customerId}`, { headers: H })
      expect(init.status()).toBe(200)
      expect((await init.json()).balance).toBe(0)

      // 직접 적립 1000
      const earn1 = await request.post(`${API}/admin/points/customers/${customerId}/earn`, {
        headers: H,
        data: { points: 1000, reason: "signup" },
      })
      expect(earn1.status()).toBe(200) // §V0-6
      expect((await earn1.json()).balance).toBe(1000)

      // 구매금액 적립: 50000 × 2% = 1000 → 누계 2000
      const earn2 = await request.post(`${API}/admin/points/customers/${customerId}/earn`, {
        headers: H,
        data: { amount: 50000, ratePercent: 2, reason: "purchase" },
      })
      expect(earn2.status()).toBe(200) // §V0-6
      expect((await earn2.json()).balance).toBe(2000)

      // 사용 500 → 잔액 1500
      const redeem1 = await request.post(`${API}/admin/points/customers/${customerId}/redeem`, {
        headers: H,
        data: { useAmount: 500 },
      })
      expect(redeem1.status()).toBe(200) // §V0-6
      expect((await redeem1.json()).balance).toBe(1500)

      // 잔액 초과 사용 → 400
      const redeemOver = await request.post(`${API}/admin/points/customers/${customerId}/redeem`, {
        headers: H,
        data: { useAmount: 999999 },
      })
      expect(redeemOver.status()).toBe(400)

      // 최종 잔액 1500 영속 확인
      const fin = await request.get(`${API}/admin/points/customers/${customerId}`, { headers: H })
      expect(fin.status()).toBe(200)
      const finBody = await fin.json()
      expect(finBody.balance).toBe(1500)
      expect(Array.isArray(finBody.ledger)).toBe(true)
    } finally {
      await request.delete(`${API}/admin/customers/${customerId}`, { headers: H })
    }
  })
})
