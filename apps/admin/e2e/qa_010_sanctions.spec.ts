/**
 * QA-010 — d5 t006_제재블랙리스트 (갭B customer-sanction 모듈) §V0-6 실HTTP 검증
 *
 *  - POST   /admin/sanctions/customers/:id   단계 상승 적용
 *  - GET    /admin/sanctions/customers/:id   현재 상태 + login_blocked
 *  - DELETE /admin/sanctions/customers/:id   해제
 *  - §V0-6: 제재 적용 성공경로 200 엄격. 자기발견형 고객 생성 + DELETE 정리.
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

test.describe("QA-010 d5 제재 — 단계상승/차단/해제 실HTTP", () => {
  test("warn→seven_days 상승 + 차단 판정 + 해제", async ({ request }) => {
    const token = await getAdminToken(request)
    const H = { authorization: `Bearer ${token}` }

    const stamp = Date.now()
    const createCust = await request.post(`${API}/admin/customers`, {
      headers: H,
      data: { email: `sanc-test-${stamp}@local.test`, first_name: "제재", last_name: "테스트" },
    })
    expect([200, 201]).toContain(createCust.status())
    const customerId = (await createCust.json()).customer?.id as string

    try {
      // 초기: 제재 없음
      const init = await request.get(`${API}/admin/sanctions/customers/${customerId}`, { headers: H })
      expect(init.status()).toBe(200)
      const initBody = await init.json()
      expect(initBody.sanction.level).toBeNull()
      expect(initBody.sanction.login_blocked).toBe(false)

      // 1차 제재 → warn (차단 아님)
      const s1 = await request.post(`${API}/admin/sanctions/customers/${customerId}`, {
        headers: H,
        data: { reason: "1차 경고" },
      })
      expect(s1.status()).toBe(200) // §V0-6
      expect((await s1.json()).sanction.level).toBe("warn")

      const g1 = await request.get(`${API}/admin/sanctions/customers/${customerId}`, { headers: H })
      const g1Body = await g1.json()
      expect(g1Body.sanction.level).toBe("warn")
      expect(g1Body.sanction.login_blocked).toBe(false) // 경고는 차단 아님

      // 2차 제재 → seven_days (차단)
      const s2 = await request.post(`${API}/admin/sanctions/customers/${customerId}`, {
        headers: H,
        data: { reason: "2차 위반" },
      })
      expect(s2.status()).toBe(200) // §V0-6
      expect((await s2.json()).sanction.level).toBe("seven_days")

      const g2 = await request.get(`${API}/admin/sanctions/customers/${customerId}`, { headers: H })
      const g2Body = await g2.json()
      expect(g2Body.sanction.level).toBe("seven_days")
      expect(g2Body.sanction.login_blocked).toBe(true) // 7일 제재 = 차단

      // 해제
      const del = await request.delete(`${API}/admin/sanctions/customers/${customerId}`, { headers: H })
      expect(del.status()).toBe(200) // §V0-6
      expect((await del.json()).lifted).toBe(true)

      const g3 = await request.get(`${API}/admin/sanctions/customers/${customerId}`, { headers: H })
      const g3Body = await g3.json()
      expect(g3Body.sanction.active).toBe(false)
      expect(g3Body.sanction.login_blocked).toBe(false) // 해제 후 차단 해제
    } finally {
      await request.delete(`${API}/admin/customers/${customerId}`, { headers: H })
    }
  })
})
