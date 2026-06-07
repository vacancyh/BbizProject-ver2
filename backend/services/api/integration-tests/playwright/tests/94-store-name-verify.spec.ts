// 시나리오 94 = settings/store 의 스토어 이름이 브랜드 변수(APP_NAME_KO=쇼핑몰)와 동기화됐는지 검증
import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:9000";
const DIR = "/tmp/playwright-shop/screenshots/menu-walk";
const EXPECTED = process.env.APP_NAME_KO || "쇼핑몰";

test.describe("시나리오 94 = 스토어 이름 = 브랜드 변수 동기화 검증", () => {
  test("settings/store 이름 = APP_NAME_KO", async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto(`${BASE}/app`);
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    await page.locator('input[name="email"]').first().waitFor({ state: "visible", timeout: 120_000 });
    await page.locator('input[name="email"]').first().fill("admin@local.test");
    await page.locator('input[name="password"]').first().fill("djemalsdlqslek12!@");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5_000);

    await page.goto(`${BASE}/app/settings/store`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2_000);

    const body = await page.locator("body").innerText().catch(() => "");
    const hasExpected = body.includes(EXPECTED);
    const hasDefaultStore = body.includes("Default Store");
    console.log(`[94] 스토어 이름 "${EXPECTED}" 노출 = ${hasExpected}`);
    console.log(`[94] 잔존 "Default Store" = ${hasDefaultStore}`);
    await page.screenshot({ path: `${DIR}/94-store-name.png`, fullPage: true });

    expect(hasExpected, `스토어 이름에 "${EXPECTED}" 미노출`).toBe(true);
    expect(hasDefaultStore, `"Default Store" 가 아직 남아있음`).toBe(false);
  });
});
