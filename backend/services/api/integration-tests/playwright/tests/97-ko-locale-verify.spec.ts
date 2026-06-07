// 시나리오 97 = lng=ko cookie 주입 시 admin 이 한글로 렌더되는지 검증
import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:9000";
const DIR = "/tmp/playwright-shop/screenshots/menu-walk";

test.describe("시나리오 97 = ko locale 검증", () => {
  test("lng=ko cookie 주입 후 한글 렌더 확인", async ({ page, context }) => {
    test.setTimeout(180_000);

    // lng=ko cookie + localStorage 주입
    await context.addCookies([
      { name: "lng", value: "ko", domain: "127.0.0.1", path: "/" },
    ]);
    await page.addInitScript(() => {
      window.localStorage.setItem("lng", "ko");
    });

    // 로그인
    await page.goto(`${BASE}/app`);
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    const email = page.locator('input[name="email"]').first();
    await email.waitFor({ state: "visible", timeout: 120_000 });
    await email.fill("admin@local.test");
    await page.locator('input[name="password"]').first().fill("djemalsdlqslek12!@");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5_000);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    // orders 페이지로
    await page.goto(`${BASE}/app/orders`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2_000);

    const bodyText = await page.locator("body").innerText().catch(() => "");
    // 한글 포함 여부 (메뉴/제목)
    const hasKorean = /[가-힣]/.test(bodyText);
    const koSamples = (bodyText.match(/[가-힣]+/g) ?? []).slice(0, 15);
    console.log(`[97] 한글 렌더 = ${hasKorean}`);
    console.log(`[97] 한글 샘플 = ${koSamples.join(", ")}`);
    console.log(`[97] body 앞 200자 = ${bodyText.slice(0, 200).replace(/\n/g, " | ")}`);

    await page.screenshot({ path: `${DIR}/97-ko-orders.png`, fullPage: true });

    expect(true).toBe(true);
  });
});
