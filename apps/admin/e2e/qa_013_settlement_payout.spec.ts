/**
 * QA-013 — d7 정산 payout (갭B settlement-payout 모듈) §V0-6 실HTTP 검증
 *
 *  - POST   /admin/settlement/periods/:key        스냅샷 upsert(순정산 계산)
 *  - POST   /admin/settlement/periods/:key/close  마감
 *  - POST   /admin/settlement/periods/:key/pay    지급완료
 *  - GET/DELETE                                   조회/정리
 *  - §V0-6: upsert/close/pay 성공경로 200 엄격. 자기발견형 period_key + DELETE 정리.
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

test.describe("QA-013 d7 정산 payout — 스냅샷/마감/지급 실HTTP", () => {
  test("스냅샷 순정산 + open→closed→paid + 종료상태 전이 거부", async ({ request }) => {
    const token = await getAdminToken(request)
    const H = { authorization: `Bearer ${token}` }
    const key = `test-${Date.now()}`

    try {
      // 스냅샷 저장: 매출 100만 - 환불 10만 - 수수료 3만 = 순정산 87만
      const up = await request.post(`${API}/admin/settlement/periods/${key}`, {
        headers: H,
        data: { gross: 1000000, refund: 100000, pgFee: 30000, memo: "QA 테스트" },
      })
      expect(up.status()).toBe(200) // §V0-6
      const upBody = await up.json()
      expect(upBody.period.net_amount).toBe(870000)
      expect(upBody.period.status).toBe("open")

      // 조회
      const get1 = await request.get(`${API}/admin/settlement/periods/${key}`, { headers: H })
      expect(get1.status()).toBe(200)
      expect((await get1.json()).period.net_amount).toBe(870000)

      // 마감 open→closed
      const close = await request.post(`${API}/admin/settlement/periods/${key}/close`, { headers: H })
      expect(close.status()).toBe(200) // §V0-6
      expect((await close.json()).period.status).toBe("closed")

      // 지급 closed→paid
      const pay = await request.post(`${API}/admin/settlement/periods/${key}/pay`, { headers: H })
      expect(pay.status()).toBe(200) // §V0-6
      const payBody = await pay.json()
      expect(payBody.period.status).toBe("paid")
      expect(typeof payBody.period.paid_at).toBe("string")

      // paid 에서 close 재시도 → 400(종료 상태)
      const reclose = await request.post(`${API}/admin/settlement/periods/${key}/close`, { headers: H })
      expect(reclose.status()).toBe(400)

      // paid 기간 스냅샷 수정 → 400
      const reedit = await request.post(`${API}/admin/settlement/periods/${key}`, {
        headers: H,
        data: { gross: 999, refund: 0, pgFee: 0 },
      })
      expect(reedit.status()).toBe(400)
    } finally {
      // 정리
      await request.delete(`${API}/admin/settlement/periods/${key}`, { headers: H })
    }
  })
})
