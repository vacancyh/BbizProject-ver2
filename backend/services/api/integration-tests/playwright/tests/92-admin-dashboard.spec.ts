// 시나리오 92 = 관리자 대시보드 + 배송/정산 메뉴·화면 + 로그인 redirect + 미인증 차단 검증
import { test, expect } from "@playwright/test";

const BASE = "http://127.0.0.1:9000";
const DIR = "/tmp/playwright-shop/screenshots/menu-walk";

async function login(page: any) {
  await page.goto(`${BASE}/app`);
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  await page.locator('input[name="email"]').first().waitFor({ state: "visible", timeout: 120_000 });
  await page.locator('input[name="email"]').first().fill("admin@local.test");
  await page.locator('input[name="password"]').first().fill("djemalsdlqslek12!@");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(6_000);
}

test.describe("시나리오 92 = 대시보드/배송/정산", () => {
  test("로그인 후 대시보드 이동 + 메뉴 + 배송/정산 화면", async ({ page }) => {
    test.setTimeout(240_000);

    await login(page);

    // 1) 로그인 직후 URL = /dashboard
    const urlAfterLogin = page.url();
    console.log(`[92] 로그인 후 URL = ${urlAfterLogin}`);
    await page.screenshot({ path: `${DIR}/92-after-login.png`, fullPage: true });

    // 2) 대시보드 화면 내용
    await page.goto(`${BASE}/app/dashboard`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1_500);
    const dashText = await page.locator("body").innerText();
    const hasDash = dashText.includes("대시보드");
    const hasToday = dashText.includes("오늘 주문 수") && dashText.includes("오늘 매출");
    const hasQuick = dashText.includes("빠른 이동");
    console.log(`[92] 대시보드: 제목=${hasDash} 지표=${hasToday} 빠른이동=${hasQuick}`);
    await page.screenshot({ path: `${DIR}/92-dashboard.png`, fullPage: true });

    // 3) 사이드바 메뉴 노출 (대시보드/배송 관리/정산 관리)
    const menuDash = dashText.includes("대시보드");
    const menuShip = dashText.includes("배송 관리");
    const menuSettle = dashText.includes("정산 관리");
    console.log(`[92] 메뉴: 대시보드=${menuDash} 배송관리=${menuShip} 정산관리=${menuSettle}`);

    // 4) 배송 관리 화면
    await page.goto(`${BASE}/app/shipping`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1_500);
    const shipText = await page.locator("body").innerText();
    const shipOk = shipText.includes("배송 관리") && shipText.includes("추후 주문/택배사/송장");
    const shipTabs = ["배송 대기", "배송 준비", "배송 중", "배송 완료", "송장 관리", "배송 설정"].filter((t) => shipText.includes(t));
    console.log(`[92] 배송 화면 ok=${shipOk} 탭=${shipTabs.length}/6`);
    await page.screenshot({ path: `${DIR}/92-shipping.png`, fullPage: true });

    // 5) 정산 관리 화면
    await page.goto(`${BASE}/app/settlement`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1_500);
    const setText = await page.locator("body").innerText();
    const setOk = setText.includes("정산 관리") && setText.includes("결제/환불/수수료/입금");
    const setTabs = ["정산 대시보드", "정산 내역", "미정산 내역", "수수료 관리", "환불/차감 내역", "정산 설정"].filter((t) => setText.includes(t));
    console.log(`[92] 정산 화면 ok=${setOk} 탭=${setTabs.length}/6`);
    await page.screenshot({ path: `${DIR}/92-settlement.png`, fullPage: true });

    // 6) 기존 메뉴 안 깨짐 (상품/주문/회원)
    const legacy: Record<string, boolean> = {};
    for (const [key, url] of [["products", "/app/products"], ["orders", "/app/orders"], ["customers", "/app/customers"]] as const) {
      await page.goto(`${BASE}${url}`);
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(1_000);
      const t = await page.locator("body").innerText();
      legacy[key] = !(await page.locator('input[name="email"]').first().isVisible().catch(() => false)) && /[가-힣]/.test(t);
    }
    console.log(`[92] 기존 메뉴 정상: ${JSON.stringify(legacy)}`);

    // 판정
    expect(urlAfterLogin, "로그인 후 대시보드로 이동 안 함").toContain("/dashboard");
    expect(hasDash && hasToday && hasQuick, "대시보드 구성 누락").toBe(true);
    expect(menuShip && menuSettle, "배송/정산 메뉴 미노출").toBe(true);
    expect(shipOk, "배송 placeholder 문구 누락").toBe(true);
    expect(setOk, "정산 placeholder 문구 누락").toBe(true);
    expect(shipTabs.length, "배송 하위탭 누락").toBe(6);
    expect(setTabs.length, "정산 하위탭 누락").toBe(6);
    expect(Object.values(legacy).every(Boolean), "기존 메뉴 깨짐").toBe(true);
  });

  test("미인증 사용자 접근 차단", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/app/dashboard`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2_000);
    const loginVisible = await page.locator('input[name="email"]').first().isVisible().catch(() => false);
    const url = page.url();
    console.log(`[92] 미인증 /dashboard 접근 → URL=${url}, 로그인폼=${loginVisible}`);
    await ctx.close();
    expect(loginVisible, "미인증인데 로그인폼 미표시(차단 실패)").toBe(true);
  });
});
