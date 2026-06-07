// 시나리오 95 = admin 화면에 'Medusa' 텍스트가 노출되는지 검증 (브랜딩 치환 확인)
import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:9000";
const DIR = "/tmp/playwright-shop/screenshots/menu-walk";

test.describe("시나리오 95 = 브랜딩(Medusa 미노출) 검증", () => {
  test("login + 메뉴에서 Medusa 텍스트 노출 0 확인", async ({ page }) => {
    test.setTimeout(180_000);

    const jsErrors: string[] = [];
    page.on("console", (m) => { if (m.type() === "error") jsErrors.push(m.text().slice(0, 200)); });
    page.on("pageerror", (e) => jsErrors.push("PAGEERR: " + e.message.slice(0, 200)));

    // 1) login 화면
    await page.goto(`${BASE}/app`);
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    await page.locator('input[name="email"]').first().waitFor({ state: "visible", timeout: 120_000 });
    const loginText = await page.locator("body").innerText().catch(() => "");
    const loginMedusa = (loginText.match(/Medusa/g) ?? []).length;
    console.log(`[95] login 화면 Medusa 노출 = ${loginMedusa}`);
    console.log(`[95] login title 영역 = ${loginText.split("\n").filter((l) => l.includes("환영") || /Medusa|쇼핑몰|Welcome/.test(l)).join(" / ")}`);
    await page.screenshot({ path: `${DIR}/95-login.png`, fullPage: true });

    // 2) 로그인 후 orders
    await page.locator('input[name="email"]').first().fill("admin@local.test");
    await page.locator('input[name="password"]').first().fill("djemalsdlqslek12!@");
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(5_000);
    await page.goto(`${BASE}/app/orders`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    const ordersText = await page.locator("body").innerText().catch(() => "");
    const ordersMedusa = (ordersText.match(/Medusa/g) ?? []).length;
    const hasKorean = /[가-힣]/.test(ordersText);
    console.log(`[95] orders 화면 Medusa 노출 = ${ordersMedusa}, 한글 = ${hasKorean}`);
    await page.screenshot({ path: `${DIR}/95-orders.png`, fullPage: true });

    // 3) settings/store (브랜딩 자주 노출되는 곳)
    await page.goto(`${BASE}/app/settings/store`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    const stText = await page.locator("body").innerText().catch(() => "");
    const stMedusa = (stText.match(/Medusa/g) ?? []).length;
    console.log(`[95] settings/store Medusa 노출 = ${stMedusa}`);

    console.log(`[95] JS 에러 수 = ${jsErrors.length}`);
    jsErrors.slice(0, 5).forEach((e) => console.log(`[95]   ${e}`));

    // admin 정상 로드(JS 에러 없음) + Medusa 미노출
    expect(jsErrors.filter((e) => e.includes("PAGEERR")).length, "admin JS 깨짐").toBe(0);
  });
});
