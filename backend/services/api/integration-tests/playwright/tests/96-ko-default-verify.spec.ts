// 시나리오 96 = clean 브라우저(쿠키/스토리지 없음)에서 admin 자동 ko default 검증
// index.html 주입 스크립트가 lng=ko 를 자동 설정하는지 확인 (cookie 수동 주입 없음)
import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:9000";
const DIR = "/tmp/playwright-shop/screenshots/menu-walk";

test.describe("시나리오 96 = 자동 ko default 검증", () => {
  test("쿠키 수동 주입 없이 한글 자동 렌더", async ({ page }) => {
    test.setTimeout(180_000);

    // 로그인 (쿠키/스토리지 사전 주입 전혀 없음 = clean)
    await page.goto(`${BASE}/app`);
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    const email = page.locator('input[name="email"]').first();
    await email.waitFor({ state: "visible", timeout: 120_000 });
    await email.fill("admin@local.test");
    await page.locator('input[name="password"]').first().fill("djemalsdlqslek12!@");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5_000);
    await page.goto(`${BASE}/app/orders`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2_000);

    const lng = await page.evaluate(() => window.localStorage.getItem("lng"));
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const hasKorean = /[가-힣]/.test(bodyText);
    const koSamples = (bodyText.match(/[가-힣]+/g) ?? []).slice(0, 12);
    console.log(`[96] localStorage.lng = ${lng}`);
    console.log(`[96] 한글 자동 렌더 = ${hasKorean}`);
    console.log(`[96] 한글 샘플 = ${koSamples.join(", ")}`);

    await page.screenshot({ path: `${DIR}/96-ko-default.png`, fullPage: true });

    expect(lng, "자동 ko default 미적용").toBe("ko");
    expect(hasKorean, "한글 미렌더").toBe(true);
  });
});
