/**
 * QA-008 — d5 t004_멤버십등급 (갭B 신규 membership 모듈) §V0-6 실HTTP 검증
 *
 * 검증 경계:
 *  - 정책: GET/POST /admin/membership/policy (policy 모듈 membership.tiers 재사용 + 이중확인 + 룰검증)
 *  - 고객 등급: GET /admin/membership/customers/:id, POST .../accrual (누적/환불 후 등급 재산정)
 *  - §V0-6: create/update 성공경로를 [200,201] 엄격 단언. 입력검증 통과만으로 PASS 금지.
 *  - 자기발견형: 고객을 생성(POST /admin/customers)하여 id 확보 → 테스트 후 DELETE 정리(재실행 안전).
 *
 * 메타룰 v2 준수: 실제 응답 단언, mock·skip 금지.
 */
import { test, expect } from "@playwright/test"

const API = process.env.MEDUSA_API ?? "http://127.0.0.1:9000"

// 표준 등급 정책(테스트 기준값 — DEFAULT_TIERS 와 동일하게 매 실행 세팅하여 재실행 안전)
const STD_TIERS = [
  { name: "일반", minAmount: 0, earnRate: 0.5 },
  { name: "실버", minAmount: 300000, earnRate: 1 },
  { name: "골드", minAmount: 1000000, earnRate: 2 },
  { name: "VIP", minAmount: 3000000, earnRate: 3 },
]

async function getAdminToken(request: any): Promise<string> {
  const res = await request.post(`${API}/auth/user/emailpass`, {
    data: { email: "admin@local.test", password: "djemalsdlqslek12!@" },
  })
  expect(res.status()).toBe(200)
  const body = await res.json()
  const token = body.token as string
  expect(typeof token).toBe("string")
  return token
}

test.describe("QA-008 d5 멤버십등급 — 정책/등급 재산정 실HTTP", () => {
  test("정책 조회/변경(이중확인·룰검증) + 고객 누적/환불 등급 재산정", async ({ request }) => {
    const token = await getAdminToken(request)
    const H = { authorization: `Bearer ${token}` }

    // ── QA-A: 정책 변경(성공경로 200) — 표준 정책 세팅(재실행 안전) ──────────
    const setRes = await request.post(`${API}/admin/membership/policy`, {
      headers: H,
      data: { tiers: STD_TIERS, confirm: true },
    })
    expect(setRes.status()).toBe(200) // §V0-6 성공경로
    const setBody = await setRes.json()
    expect(setBody.key).toBe("membership.tiers")

    // 정책 조회(200) + 단조증가 확인
    const getPol = await request.get(`${API}/admin/membership/policy`, { headers: H })
    expect(getPol.status()).toBe(200)
    const pol = await getPol.json()
    expect(Array.isArray(pol.tiers)).toBe(true)
    expect(pol.tiers.length).toBe(4)
    for (let i = 1; i < pol.tiers.length; i++) {
      expect(pol.tiers[i].minAmount).toBeGreaterThan(pol.tiers[i - 1].minAmount)
    }

    // ── QA-B: 이중확인 게이트(409) + 룰검증 실패(400) ─────────────────────────
    const noConfirm = await request.post(`${API}/admin/membership/policy`, {
      headers: H,
      data: { tiers: STD_TIERS }, // confirm 누락
    })
    expect(noConfirm.status()).toBe(409)

    const badRule = await request.post(`${API}/admin/membership/policy`, {
      headers: H,
      data: {
        tiers: [
          { name: "a", minAmount: 0, earnRate: 1 },
          { name: "b", minAmount: 0, earnRate: 1 }, // 단조증가 위반
        ],
        confirm: true,
      },
    })
    expect(badRule.status()).toBe(400)

    // ── QA-C: 고객 생성(자기발견) → 등급 누적/환불 재산정 ─────────────────────
    const stamp = Date.now()
    const email = `mbr-test-${stamp}@local.test`
    const createCust = await request.post(`${API}/admin/customers`, {
      headers: H,
      data: { email, first_name: "멤버십", last_name: "테스트" },
    })
    expect([200, 201]).toContain(createCust.status()) // §V0-6 성공경로
    const custBody = await createCust.json()
    const customerId = custBody.customer?.id as string
    expect(typeof customerId).toBe("string")

    try {
      // 미가입 조회 → 일반/0
      const init = await request.get(`${API}/admin/membership/customers/${customerId}`, { headers: H })
      expect(init.status()).toBe(200)
      const initBody = await init.json()
      expect(initBody.membership.current_tier).toBe("일반")
      expect(initBody.membership.accrued_amount).toBe(0)

      // 누적 150만 → 골드 승급(100만 이상 300만 미만)
      const accrue = await request.post(`${API}/admin/membership/customers/${customerId}/accrual`, {
        headers: H,
        data: { amount: 1500000 },
      })
      expect(accrue.status()).toBe(200) // §V0-6 성공경로
      const accBody = await accrue.json()
      expect(accBody.membership.accrued_amount).toBe(1500000)
      expect(accBody.membership.current_tier).toBe("골드")

      // 재조회 영속 확인
      const reGet = await request.get(`${API}/admin/membership/customers/${customerId}`, { headers: H })
      expect(reGet.status()).toBe(200)
      expect((await reGet.json()).membership.current_tier).toBe("골드")

      // 환불 140만 차감 → 누적 10만 → 일반 하향
      const refund = await request.post(`${API}/admin/membership/customers/${customerId}/accrual`, {
        headers: H,
        data: { amount: 1400000, type: "refund" },
      })
      expect(refund.status()).toBe(200) // §V0-6 성공경로
      const refBody = await refund.json()
      expect(refBody.membership.accrued_amount).toBe(100000)
      expect(refBody.membership.current_tier).toBe("일반")
    } finally {
      // 정리(재실행 안전) — 고객 삭제
      await request.delete(`${API}/admin/customers/${customerId}`, { headers: H })
    }
  })
})
