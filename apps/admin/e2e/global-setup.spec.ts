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

  // 보안(2026-07-28): 스펙에 박혀 있던 실 자격증명 제거 — env 주입, 기본값은 문서화된 로컬 관리자.
  const E2E_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@shop.local";
  const E2E_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin1234!";

  const emailVal = await emailInput.inputValue();
  if (!emailVal) {
    await emailInput.fill(E2E_EMAIL);
  }

  const pwVal = await pwInput.inputValue();
  if (!pwVal) {
    await pwInput.fill(E2E_PASSWORD);
  }

  // 로그인 버튼 클릭
  await page.getByRole("button", { name: /로그인/i }).click();

  // /dashboard 도달 대기
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  // storageState 저장
  await page.context().storageState({ path: AUTH_FILE });
});
