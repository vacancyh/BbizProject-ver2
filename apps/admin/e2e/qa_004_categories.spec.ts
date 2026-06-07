/**
 * QA-004 — d4_카테고리 연계 검증 (QA-001 / QA-004)
 *
 * 검증 경계:
 *  - QA-001: 카테고리 생성 → 상품 연동 (POST /admin/product-categories 2xx + products add 실왕복)
 *  - QA-004: slug 변경 → 반영 (handle 수정 2xx + 재조회 신 handle 반영 = 캐시 무효화 데이터 검증
 *            + 중복 검증 데이터원: 목록에서 handle 노출 확인 → isDuplicateSlug 판정 근거)
 *
 * §V0-6 준수:
 *  - 워크플로우 route(product-categories create/update, products add)는 입력검증 통과만으로 PASS 금지.
 *  - 성공경로 [200,201] 엄격 단언으로 실HTTP 2xx 게이트 검증.
 *
 * §V0-5 준수: 신규 커스텀 백엔드 route 없음 — Medusa 코어 /admin/product-categories · /admin/products 직접 호출.
 *
 * 메타룰 v2 준수: 실제 API 응답 단언, mock·skip 금지, 자기발견형 픽스처 + 말미 DELETE 정리.
 */
import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:7001";

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

function productBody(title: string, handle: string) {
  return {
    title,
    handle,
    status: "draft",
    options: [{ title: "기본", values: ["기본"] }],
    variants: [{ title: "기본", options: { 기본: "기본" }, prices: [{ amount: 10000, currency_code: "krw" }] }],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QA-001: 카테고리 생성 → 상품 연동
// ─────────────────────────────────────────────────────────────────────────────
test.describe("QA-001 d4_카테고리 카테고리 생성 → 상품 연동", () => {
  test("카테고리 생성(2xx) + 상품 생성(2xx) + 연동(2xx) + 연동확인", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };
    const stamp = Date.now();
    let categoryId = "";
    let productId = "";

    try {
      // 1. 카테고리 생성 — ★ [200,201] 엄격 단언(§V0-6)
      const catRes = await request.post(`${API}/admin/product-categories`, {
        headers: H,
        data: { name: `QA004 카테고리 ${stamp}`, handle: `qa004-cat-${stamp}` },
      });
      expect([200, 201]).toContain(catRes.status());
      categoryId = (await catRes.json()).product_category.id;
      expect(categoryId).toBeTruthy();

      // 2. 상품 생성 — 2xx
      const prodRes = await request.post(`${API}/admin/products`, {
        headers: H,
        data: productBody(`QA004 상품 ${stamp}`, `qa004-prod-${stamp}`),
      });
      expect([200, 201]).toContain(prodRes.status());
      productId = (await prodRes.json()).product.id;

      // 3. 상품 연동 — POST /admin/product-categories/:id/products {add} 2xx
      const linkRes = await request.post(`${API}/admin/product-categories/${categoryId}/products`, {
        headers: H,
        data: { add: [productId] },
      });
      expect([200, 201]).toContain(linkRes.status());

      // 4. 연동 확인 — 카테고리 상세의 products 에 포함
      const verifyRes = await request.get(
        `${API}/admin/product-categories/${categoryId}?fields=id,products.id`,
        { headers: H }
      );
      expect(verifyRes.status()).toBe(200);
      const verify = await verifyRes.json();
      expect((verify.product_category.products ?? []).some((p: any) => p.id === productId)).toBe(true);
    } finally {
      if (productId) await request.delete(`${API}/admin/products/${productId}`, { headers: H });
      if (categoryId) await request.delete(`${API}/admin/product-categories/${categoryId}`, { headers: H });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QA-004: slug 변경 → 반영 + 중복 검증 데이터원
// ─────────────────────────────────────────────────────────────────────────────
test.describe("QA-004 d4_카테고리 slug 변경 → 반영", () => {
  test("handle 수정(2xx) + 재조회 신 handle 반영 + 목록 노출(중복 판정 근거)", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };
    const stamp = Date.now();
    const oldHandle = `qa004-old-${stamp}`;
    const newHandle = `qa004-new-${stamp}`;
    let categoryId = "";

    try {
      // 1. 카테고리 생성(옛 slug) — 2xx
      const catRes = await request.post(`${API}/admin/product-categories`, {
        headers: H,
        data: { name: `QA004 slug ${stamp}`, handle: oldHandle },
      });
      expect([200, 201]).toContain(catRes.status());
      categoryId = (await catRes.json()).product_category.id;

      // 2. slug 변경 — handle 수정 ★ [200,201] 엄격 단언(§V0-6)
      const updRes = await request.post(`${API}/admin/product-categories/${categoryId}`, {
        headers: H,
        data: { handle: newHandle },
      });
      expect([200, 201]).toContain(updRes.status());
      expect((await updRes.json()).product_category.handle).toBe(newHandle);

      // 3. 재조회 — 신 handle 반영 확인(캐시 무효화 후 fresh read 동등)
      const getRes = await request.get(
        `${API}/admin/product-categories/${categoryId}?fields=id,handle`,
        { headers: H }
      );
      expect(getRes.status()).toBe(200);
      expect((await getRes.json()).product_category.handle).toBe(newHandle);

      // 4. 중복 검증 데이터원 — 목록 조회 시 신 handle 노출(isDuplicateSlug 판정 근거 존재)
      const listRes = await request.get(`${API}/admin/product-categories?limit=200&fields=id,handle`, {
        headers: H,
      });
      expect(listRes.status()).toBe(200);
      const handles = (await listRes.json()).product_categories.map((c: any) => c.handle);
      expect(handles).toContain(newHandle);
      expect(handles).not.toContain(oldHandle); // 옛 slug 는 더 이상 없음(중복 오판 방지)
    } finally {
      if (categoryId) await request.delete(`${API}/admin/product-categories/${categoryId}`, { headers: H });
    }
  });
});
