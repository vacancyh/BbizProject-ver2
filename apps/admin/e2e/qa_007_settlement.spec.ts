/**
 * QA-007 — d7_정산관리 데이터원 검증
 *
 * 검증 경계(코어 직접호출 §V0-5 — Medusa /admin/orders 결제 필드):
 *  - 정산은 Medusa 코어에 쓰기/payout endpoint 가 없는 read-only 집계 도메인.
 *  - 따라서 §V0-6 성공경로 2xx 게이트는 "집계가 소비하는 결제 데이터 조회 GET 200" 에 적용.
 *  - settlement.ts getSettlementSummary 가 사용하는 정확한 fields 쿼리로 200 + 소비 가능한 shape 확인.
 *
 * 메타룰 v2 준수: 실제 응답 단언, mock·skip 금지. 읽기 전용이라 부작용 없음(정리 불필요).
 *
 * 주: 정산 집계/수수료/순정산/엑셀 = 순수함수(settlement-logic·settlement-excel-logic) vitest 로 검증.
 *     payout/실지급·세금계산서 연동 = 갭B 신규 정산 모듈(deferred).
 */
import { test, expect } from "@playwright/test";

const API = process.env.MEDUSA_API ?? "http://127.0.0.1:9000";

async function getAdminToken(request: any): Promise<string> {
  const res = await request.post(`${API}/auth/user/emailpass`, {
    data: { email: "admin@local.test", password: "djemalsdlqslek12!@" },
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const token = body.token as string;
  expect(typeof token).toBe("string");
  return token;
}

const SETTLEMENT_FIELDS =
  "id,display_id,created_at,currency_code,status,payment_status,total," +
  "payment_collections.payments.amount,payment_collections.payments.captured_at," +
  "payment_collections.payments.refunds.amount";

test.describe("QA-007 d7_정산관리 결제 데이터원 조회", () => {
  test("주문 결제필드 조회(200) + 집계 소비 가능 shape", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };

    // 정산 집계가 사용하는 정확한 쿼리 — 성공경로 200(§V0-6 read 게이트)
    const res = await request.get(
      `${API}/admin/orders?limit=5&order=-display_id&fields=${encodeURIComponent(SETTLEMENT_FIELDS)}`,
      { headers: H }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.orders)).toBe(true);

    // 집계 소비 가능 shape — 각 주문이 id/created_at/status/payment_collections 구조를 갖는지
    for (const o of body.orders) {
      expect(typeof o.id).toBe("string");
      expect(o).toHaveProperty("created_at");
      expect(o).toHaveProperty("status");
      // payment_collections 는 있을 수도 없을 수도(미결제 주문). 있으면 배열.
      if (o.payment_collections !== undefined && o.payment_collections !== null) {
        expect(Array.isArray(o.payment_collections)).toBe(true);
      }
    }
  });
});
