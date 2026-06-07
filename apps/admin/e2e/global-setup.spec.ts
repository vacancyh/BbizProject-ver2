/**
 * 로그인 global-setup — storageState 저장
 * /login 페이지 진입 → 이미 채워진 폼 → 로그인 버튼 클릭 → /dashboard 대기
 */
import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_FILE = path.resolve(__dirname, ".auth/state.json");

test("login and save storage state", async ({ page }) => {
  await page.goto("/login");

  // 자동입력 값이 채워질 때까지 대기
  await page.waitForSelector("input[type='email']", { timeout: 10000 });

  // 이미 채워져 있지 않으면 직접 입력
  const emailInput = page.locator("input[type='email']");
  const pwInput = page.locator("input[type='password']");

  const emailVal = await emailInput.inputValue();
  if (!emailVal) {
    await emailInput.fill("admin@local.test");
  }

  const pwVal = await pwInput.inputValue();
  if (!pwVal) {
    await pwInput.fill("djemalsdlqslek12!@");
  }

  // 로그인 버튼 클릭
  await page.getByRole("button", { name: /로그인/i }).click();

  // /dashboard 도달 대기
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // storageState 저장
  await page.context().storageState({ path: AUTH_FILE });
});
