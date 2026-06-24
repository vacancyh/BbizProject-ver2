/**
 * QA-005 — d5_회원관리 코어 달성가능 연계 검증
 *
 * 검증 경계(코어 직접호출 §V0-5 — Medusa /admin/customers · /admin/customer-groups):
 *  - QA-A(t001): 고객 생성(2xx) + 조회 반영
 *  - QA-B(t002): 고객그룹 생성(2xx) + 회원 연동(add 2xx) + 그룹 소속 확인
 *
 * §V0-6 준수: customers/customer-groups create·add 성공경로 [200,201] 엄격 단언(실HTTP 2xx).
 * 메타룰 v2 준수: 실제 응답 단언, mock·skip 금지, 자기발견형 픽스처 + 말미 DELETE 정리.
 *
 * 주: t004~t008(멤버십·포인트·제재·세금계산서·동의)은 갭B 신규 백엔드 모듈 미구현 →
 *     비즈니스 룰 순수함수만 본 턴 구현(vitest), HTTP 워크플로우는 deferred(브리핑 문서 명시).
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

test.describe("QA-A d5_회원관리 고객 생성 → 조회", () => {
  test("고객 생성(2xx) + 조회 반영", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };
    const stamp = Date.now();
    const email = `qa005-${stamp}@local.test`;
    let customerId = "";

    try {
      const createRes = await request.post(`${API}/admin/customers`, {
        headers: H,
        data: { email, first_name: "QA005", last_name: `${stamp}` },
      });
      expect([200, 201]).toContain(createRes.status());
      customerId = (await createRes.json()).customer.id;
      expect(customerId).toBeTruthy();

      const getRes = await request.get(`${API}/admin/customers/${customerId}?fields=id,email`, {
        headers: H,
      });
      expect(getRes.status()).toBe(200);
      expect((await getRes.json()).customer.email).toBe(email);
    } finally {
      if (customerId) await request.delete(`${API}/admin/customers/${customerId}`, { headers: H });
    }
  });
});

test.describe("QA-B d5_회원관리 고객그룹 생성 → 회원 연동", () => {
  test("그룹 생성(2xx) + 고객 생성(2xx) + 연동(2xx) + 소속 확인", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };
    const stamp = Date.now();
    let groupId = "";
    let customerId = "";

    try {
      // 1. 그룹 생성 — 2xx
      const grpRes = await request.post(`${API}/admin/customer-groups`, {
        headers: H,
        data: { name: `QA005 그룹 ${stamp}` },
      });
      expect([200, 201]).toContain(grpRes.status());
      groupId = (await grpRes.json()).customer_group.id;

      // 2. 고객 생성 — 2xx
      const custRes = await request.post(`${API}/admin/customers`, {
        headers: H,
        data: { email: `qa005-grp-${stamp}@local.test`, first_name: "그룹", last_name: "회원" },
      });
      expect([200, 201]).toContain(custRes.status());
      customerId = (await custRes.json()).customer.id;

      // 3. 회원 연동 — POST /admin/customer-groups/:id/customers {add} 2xx
      const linkRes = await request.post(`${API}/admin/customer-groups/${groupId}/customers`, {
        headers: H,
        data: { add: [customerId] },
      });
      expect([200, 201]).toContain(linkRes.status());

      // 4. 소속 확인
      const verifyRes = await request.get(
        `${API}/admin/customer-groups/${groupId}?fields=id,customers.id`,
        { headers: H }
      );
      expect(verifyRes.status()).toBe(200);
      const verify = await verifyRes.json();
      expect((verify.customer_group.customers ?? []).some((c: any) => c.id === customerId)).toBe(true);
    } finally {
      if (customerId) await request.delete(`${API}/admin/customers/${customerId}`, { headers: H });
      if (groupId) await request.delete(`${API}/admin/customer-groups/${groupId}`, { headers: H });
    }
  });
});
