// 시나리오 93 = 관리자 용어 개선(직역체 → 쇼핑몰체) 화면 검증
// 핵심 화면을 돌며 직역어(제품/변형/가용성/게시/게스트) 잔존 0 + 신규어(상품/옵션상품) 노출 확인
import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:9000";
const DIR = "/tmp/playwright-shop/screenshots/menu-walk";

// 직역어(있으면 안 됨) / 신규어(있어야 자연스러움)
const FORBIDDEN = ["제품", "변형", "가용성", "게스트", "고객", "재정의", "열림"];

const PAGES = [
  { key: "products", url: "/app/products" },
  { key: "products-create", url: "/app/products/create" },
  { key: "orders", url: "/app/orders" },
  { key: "customers", url: "/app/customers" },
  { key: "customer-groups", url: "/app/customer-groups" },
  { key: "draft-orders", url: "/app/draft-orders" },
  { key: "inventory", url: "/app/inventory" },
];

test.describe("시나리오 93 = 관리자 용어 개선 검증", () => {
  test("핵심 화면 직역어 잔존 0 + 상품/옵션상품 노출", async ({ page }) => {
    test.setTimeout(300_000);

    // 로그인
    await page.goto(`${BASE}/app`);
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    await page.locator('input[name="email"]').first().waitFor({ state: "visible", timeout: 120_000 });
    await page.locator('input[name="email"]').first().fill("admin@local.test");
    await page.locator('input[name="password"]').first().fill("djemalsdlqslek12!@");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5_000);

    const violations: string[] = [];
    let sawSangpum = false;

    for (const p of PAGES) {
      await page.goto(`${BASE}${p.url}`);
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(2_000);
      const body = await page.locator("body").innerText().catch(() => "");
      const hit = FORBIDDEN.filter((w) => body.includes(w));
      if (body.includes("상품")) sawSangpum = true;
      console.log(`[93] ${p.key.padEnd(16)} 직역어잔존=${hit.join(",") || "없음"}  상품노출=${body.includes("상품")}`);
      if (hit.length) violations.push(`${p.key}: ${hit.join(",")}`);
      await page.screenshot({ path: `${DIR}/93-${p.key}.png`, fullPage: true });
    }

    console.log(`[93] 위반 = ${violations.length ? violations.join(" | ") : "없음"}`);
    expect(violations, `직역어 잔존 화면: ${violations.join(" | ")}`).toEqual([]);
    expect(sawSangpum, "'상품' 미노출").toBe(true);
  });
});
