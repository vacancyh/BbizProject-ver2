/**
 * QA-006 — d6_배송관리 코어 달성가능 연계 검증
 *
 * 검증 경계(코어 직접호출 §V0-5 — Medusa /admin/stock-locations · /admin/shipping-profiles):
 *  - QA-A(t001): 출고지/창고 생성(2xx) + 조회 반영 + 정리
 *  - QA-B(t002): 배송 프로파일 생성(2xx) + 조회 반영 + 정리
 *
 * §V0-6 준수: stock-locations/shipping-profiles create 성공경로 [200,201] 엄격 단언(실HTTP 2xx).
 * 메타룰 v2 준수: 실제 응답 단언, mock·skip 금지, 자기발견형 픽스처 + 말미 DELETE 정리.
 *
 * 주: t003 국내택배연동·t004 운송장CSV일괄 = 비즈니스 룰 순수함수만 본 턴 구현(vitest),
 *     백엔드 일괄 import/bulk-ship route 는 deferred(브리핑 명시).
 *     t005 반품·교환 검수 = 직전 세션 RMA 라우트로 이미 구현 완료(A).
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

test.describe("QA-A d6_배송관리 출고지/창고 생성", () => {
  test("stock-location 생성(2xx) + 조회 반영", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };
    const stamp = Date.now();
    let locationId = "";

    try {
      const createRes = await request.post(`${API}/admin/stock-locations`, {
        headers: H,
        data: { name: `QA006 창고 ${stamp}` },
      });
      expect([200, 201]).toContain(createRes.status());
      locationId = (await createRes.json()).stock_location.id;
      expect(locationId).toBeTruthy();

      const getRes = await request.get(`${API}/admin/stock-locations/${locationId}?fields=id,name`, {
        headers: H,
      });
      expect(getRes.status()).toBe(200);
      expect((await getRes.json()).stock_location.name).toBe(`QA006 창고 ${stamp}`);
    } finally {
      if (locationId) await request.delete(`${API}/admin/stock-locations/${locationId}`, { headers: H });
    }
  });
});

test.describe("QA-B d6_배송관리 배송 프로파일 생성", () => {
  test("shipping-profile 생성(2xx) + 조회 반영", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };
    const stamp = Date.now();
    let profileId = "";

    try {
      const createRes = await request.post(`${API}/admin/shipping-profiles`, {
        headers: H,
        data: { name: `QA006 배송정책 ${stamp}`, type: "default" },
      });
      expect([200, 201]).toContain(createRes.status());
      profileId = (await createRes.json()).shipping_profile.id;
      expect(profileId).toBeTruthy();

      const getRes = await request.get(
        `${API}/admin/shipping-profiles/${profileId}?fields=id,name`,
        { headers: H }
      );
      expect(getRes.status()).toBe(200);
      expect((await getRes.json()).shipping_profile.name).toBe(`QA006 배송정책 ${stamp}`);
    } finally {
      if (profileId) await request.delete(`${API}/admin/shipping-profiles/${profileId}`, { headers: H });
    }
  });
});
