// 시나리오 98 = Admin UI 로그인 진단 (root cause 추적 전용)
// fill 반영 여부 + /auth POST 요청/응답 + 로그인 후 상태를 단계별 로깅
import { test, expect } from "@playwright/test";
import fs from "fs";

const BASE = "http://127.0.0.1:9000";
const DIR = "/tmp/playwright-shop/screenshots/menu-walk";

test.describe("시나리오 98 = 로그인 진단", () => {
  test("fill 반영 + auth 요청/응답 캡처", async ({ page }) => {
    test.setTimeout(300_000);
    fs.mkdirSync(DIR, { recursive: true });

    const authEvents: string[] = [];
    page.on("response", async (resp) => {
      const u = resp.url();
      if (u.includes("/auth/") || u.includes("/admin/users/me") || u.includes("/admin/invites")) {
        let bodyPreview = "";
        try { bodyPreview = (await resp.text()).slice(0, 200); } catch {}
        authEvents.push(`${resp.status()} ${resp.request().method()} ${u.replace(BASE, "")} :: ${bodyPreview}`);
      }
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") authEvents.push(`CONSOLE_ERR: ${msg.text().slice(0, 200)}`);
    });

    await page.goto(`${BASE}/app`);
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});

    const email = page.locator('input[name="email"]').first();
    await email.waitFor({ state: "visible", timeout: 120_000 });

    // 방법 A: pressSequentially (React onChange 확실 trigger)
    await email.click();
    await email.pressSequentially("admin@local.test", { delay: 20 });
    const pw = page.locator('input[name="password"]').first();
    await pw.click();
    await pw.pressSequentially("djemalsdlqslek12!@", { delay: 20 });

    // 입력값 verify
    const emailVal = await email.inputValue();
    const pwLen = (await pw.inputValue()).length;
    console.log(`[98] 입력 후 email="${emailVal}" pwLen=${pwLen}`);

    await page.screenshot({ path: `${DIR}/98-before-submit.png`, fullPage: true });

    // submit
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(6_000);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    const url = page.url();
    const loginFormStill = await page.locator('input[name="email"]').first().isVisible().catch(() => false);
    console.log(`[98] submit 후 URL=${url} loginForm잔존=${loginFormStill}`);
    console.log(`[98] === auth/console 이벤트 (${authEvents.length}) ===`);
    authEvents.forEach((e) => console.log(`[98]   ${e}`));

    await page.screenshot({ path: `${DIR}/98-after-submit.png`, fullPage: true });

    // 진단 전용 = 항상 통과 (결과는 로그로 판단)
    expect(true).toBe(true);
  });
});
