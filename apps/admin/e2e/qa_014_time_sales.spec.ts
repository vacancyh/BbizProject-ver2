/**
 * QA-014 — d3 타임세일 (갭B time-sale 모듈) §V0-6 실HTTP 검증
 *
 *  - POST   /admin/time-sales              세일 생성(validateSale, 201)
 *  - GET    /admin/time-sales              목록
 *  - GET    /admin/time-sales/:id          단건(discount_value number 정규화 확인)
 *  - DELETE /admin/time-sales/:id          강제 종료(status=ended)
 *  - §V0-6: 생성 201 + 종료 200 엄격. product_id 는 느슨 연결(text)이라 임의값.
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

test.describe("QA-014 d3 타임세일 — 생성/조회/종료 실HTTP", () => {
  test("세일 생성(active) + 목록/단건 + 잘못된 할인율 거부 + 강제종료", async ({ request }) => {
    const token = await getAdminToken(request)
    const H = { authorization: `Bearer ${token}` }

    const now = Date.now()
    const starts = new Date(now - 3600_000).toISOString() // 1시간 전
    const ends = new Date(now + 7 * 86400_000).toISOString() // 7일 후

    // 생성 → 201, 진행중(active)
    const created = await request.post(`${API}/admin/time-sales`, {
      headers: H,
      data: {
        product_id: `prod_qa_${now}`,
        title: "QA 타임세일",
        discount_type: "percent",
        discount_value: 30,
        original_price: 10000,
        starts_at: starts,
        ends_at: ends,
      },
    })
    expect(created.status()).toBe(201) // §V0-6
    const sale = (await created.json()).time_sale
    expect(sale.status).toBe("active") // starts 과거 + ends 미래
    const saleId = sale.id as string

    // 잘못된 할인율(percent 150) → 400
    const bad = await request.post(`${API}/admin/time-sales`, {
      headers: H,
      data: {
        product_id: `prod_qa_${now}`,
        title: "잘못된 세일",
        discount_type: "percent",
        discount_value: 150,
        starts_at: starts,
        ends_at: ends,
      },
    })
    expect(bad.status()).toBe(400)

    // 목록 → 200
    const list = await request.get(`${API}/admin/time-sales?limit=10`, { headers: H })
    expect(list.status()).toBe(200)
    expect(Array.isArray((await list.json()).time_sales)).toBe(true)

    // 단건 → 200, discount_value number 정규화 확인(numeric→string 함정 방지)
    const one = await request.get(`${API}/admin/time-sales/${saleId}`, { headers: H })
    expect(one.status()).toBe(200)
    const oneBody = (await one.json()).time_sale
    expect(oneBody.discount_value).toBe(30) // string "30" 아님
    expect(typeof oneBody.discount_value).toBe("number")

    // 강제 종료 → 200, ended
    const del = await request.delete(`${API}/admin/time-sales/${saleId}`, { headers: H })
    expect(del.status()).toBe(200) // §V0-6
    const delBody = await del.json()
    expect(delBody.ended).toBe(true)
    expect(delBody.time_sale.status).toBe("ended")
  })
})
