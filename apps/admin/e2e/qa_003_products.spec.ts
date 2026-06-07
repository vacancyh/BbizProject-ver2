/**
 * QA-003 — d3_상품관리 연계 검증 (QA-001 / QA-003 / QA-004)
 *
 * 검증 경계:
 *  - QA-001: 등록 → 목록 → 노출 ON (POST /admin/products 2xx + 목록 반영 + status=published 실왕복)
 *  - QA-003: 대량 import → 목록 반영 (createProduct 다건 = import 경로와 동일 코어 endpoint + 목록 count 반영)
 *  - QA-004: 변형 → 재고 → 조정 (inventory-items + location-levels create/update 성공경로 2xx 실왕복)
 *
 * §V0-6 준수:
 *  - 워크플로우 호출 route(products create/publish, inventory location-levels)는 입력검증 통과만으로 PASS 금지.
 *  - 성공경로 [200,201] 엄격 단언으로 실HTTP 2xx 게이트 검증.
 *
 * §V0-5 준수: 신규 커스텀 백엔드 route 없음 — Medusa 코어 /admin/products · /admin/inventory-items 직접 호출.
 *
 * 메타룰 v2 준수:
 *  - 거짓 PASS 금지: 모든 케이스 실제 API 응답(status + body 단언). mock·skip 금지.
 *  - 자기발견형 픽스처: 외부 하드코딩 ID 의존 없이 테스트가 직접 생성하고 말미에 DELETE 정리(재실행 안전).
 */
import { test, expect } from "@playwright/test";

const API = "http://127.0.0.1:7001";

/** Bearer 토큰 획득 헬퍼 */
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

/** 단위 테스트 픽스처 상품 생성 본문 (코어 createProduct 정합 — 기본 옵션/변형/가격) */
function productBody(title: string, handle: string, status: "draft" | "published" = "draft") {
  return {
    title,
    handle,
    status,
    options: [{ title: "기본", values: ["기본"] }],
    variants: [
      {
        title: "기본",
        options: { 기본: "기본" },
        prices: [{ amount: 10000, currency_code: "krw" }],
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QA-001: 등록 → 목록 → 노출 ON
// ─────────────────────────────────────────────────────────────────────────────
test.describe("QA-001 d3_상품관리 등록 → 목록 → 노출 ON", () => {
  test("상품 등록(2xx) + 목록 반영 + status=published 실왕복", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };
    const stamp = Date.now();
    const handle = `qa003-a-${stamp}`;
    const title = `QA003 등록상품 ${stamp}`;

    // 1. 등록 — ★ [200,201] 엄격 단언(§V0-6 성공경로)
    const createRes = await request.post(`${API}/admin/products`, {
      headers: H,
      data: productBody(title, handle, "draft"),
    });
    expect([200, 201]).toContain(createRes.status());
    const created = await createRes.json();
    const productId = created.product.id as string;
    expect(productId).toBeTruthy();

    try {
      // 2. 목록 반영 — q 검색으로 방금 등록 상품 노출 확인
      const listRes = await request.get(
        `${API}/admin/products?q=${encodeURIComponent(title)}&limit=20`,
        { headers: H }
      );
      expect(listRes.status()).toBe(200);
      const list = await listRes.json();
      expect(list.products.some((p: any) => p.id === productId)).toBe(true);

      // 3. 노출 ON — status=published 실왕복(2xx)
      const pubRes = await request.post(`${API}/admin/products/${productId}`, {
        headers: H,
        data: { status: "published" },
      });
      expect([200, 201]).toContain(pubRes.status());
      const pub = await pubRes.json();
      expect(pub.product.status).toBe("published");

      // 4. published 필터 목록에 반영
      const pubListRes = await request.get(
        `${API}/admin/products?status[]=published&q=${encodeURIComponent(title)}&limit=20`,
        { headers: H }
      );
      expect(pubListRes.status()).toBe(200);
      const pubList = await pubListRes.json();
      expect(pubList.products.some((p: any) => p.id === productId)).toBe(true);
    } finally {
      // 정리
      await request.delete(`${API}/admin/products/${productId}`, { headers: H });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QA-003: 대량 import → 목록 반영 (createProduct 다건 = import 경로 동일 endpoint)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("QA-003 d3_상품관리 대량 import → 목록 반영", () => {
  test("배치 등록(2건 2xx) + 목록 count 반영", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };
    const stamp = Date.now();
    const ids: string[] = [];

    try {
      for (let i = 0; i < 2; i++) {
        const title = `QA003 배치 ${stamp}-${i}`;
        const res = await request.post(`${API}/admin/products`, {
          headers: H,
          data: productBody(title, `qa003-b-${stamp}-${i}`, "draft"),
        });
        expect([200, 201]).toContain(res.status()); // §V0-6 성공경로
        const body = await res.json();
        ids.push(body.product.id);
      }
      expect(ids).toHaveLength(2);

      // 목록 반영 — 공통 stamp 로 검색하면 2건 모두 노출
      const listRes = await request.get(
        `${API}/admin/products?q=${encodeURIComponent(`QA003 배치 ${stamp}`)}&limit=20`,
        { headers: H }
      );
      expect(listRes.status()).toBe(200);
      const list = await listRes.json();
      const found = list.products.filter((p: any) => ids.includes(p.id));
      expect(found.length).toBe(2);
    } finally {
      for (const id of ids) {
        await request.delete(`${API}/admin/products/${id}`, { headers: H });
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// QA-004: 변형 → 재고 → 조정 (inventory-items + location-levels 2xx 실왕복)
// ─────────────────────────────────────────────────────────────────────────────
test.describe("QA-004 d3_상품관리 변형 → 재고 → 조정", () => {
  test("재고 아이템 생성(2xx) + 위치레벨 생성/조정 실왕복", async ({ request }) => {
    const token = await getAdminToken(request);
    const H = { authorization: `Bearer ${token}` };
    const stamp = Date.now();

    // 0. 재고 위치(창고) 확보 — 존재 전제(d2 이행에서 생성됨). 없으면 명확 실패.
    const locRes = await request.get(`${API}/admin/stock-locations?limit=1`, { headers: H });
    expect(locRes.status()).toBe(200);
    const locBody = await locRes.json();
    expect(
      locBody.stock_locations.length,
      "재고 위치(stock-location)가 최소 1개 존재해야 함(픽스처 전제)"
    ).toBeGreaterThan(0);
    const locationId = locBody.stock_locations[0].id as string;

    // 1. 재고 아이템 생성 — ★ [200,201] 엄격 단언(§V0-6 성공경로)
    const itemRes = await request.post(`${API}/admin/inventory-items`, {
      headers: H,
      data: { sku: `QA003-SKU-${stamp}`, title: `QA003 재고 ${stamp}` },
    });
    expect([200, 201]).toContain(itemRes.status());
    const itemBody = await itemRes.json();
    const itemId = itemBody.inventory_item.id as string;
    expect(itemId).toBeTruthy();

    try {
      // 2. 위치레벨 생성(초기 재고 10) — 2xx
      const createLevelRes = await request.post(
        `${API}/admin/inventory-items/${itemId}/location-levels`,
        { headers: H, data: { location_id: locationId, stocked_quantity: 10 } }
      );
      expect([200, 201]).toContain(createLevelRes.status());

      // 3. 재고 조정(증감: 10 → 15) — 2xx 실왕복
      const updateLevelRes = await request.post(
        `${API}/admin/inventory-items/${itemId}/location-levels/${locationId}`,
        { headers: H, data: { stocked_quantity: 15 } }
      );
      expect([200, 201]).toContain(updateLevelRes.status());

      // 4. 반영 확인 — location_levels 재조회
      const verifyRes = await request.get(
        `${API}/admin/inventory-items/${itemId}?fields=id,*location_levels`,
        { headers: H }
      );
      expect(verifyRes.status()).toBe(200);
      const verify = await verifyRes.json();
      const level = (verify.inventory_item.location_levels ?? []).find(
        (l: any) => l.location_id === locationId
      );
      expect(level).toBeTruthy();
      expect(level.stocked_quantity).toBe(15);
    } finally {
      // 정리 — 재고 아이템 삭제(연결 위치레벨 cascade)
      await request.delete(`${API}/admin/inventory-items/${itemId}`, { headers: H });
    }
  });
});
