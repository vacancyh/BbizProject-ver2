// 시나리오 99 = Admin 좌측 메뉴 전체 자동 순회 + 에러 자동 캐치 (강화판)
// 목적: 사장님 발견 "상품/주문 외 메뉴 전부 에러" 의 메뉴별 root cause 박제
// §V0 환류: 이전 버전은 로그인 화면을 PASS 로 오판 (거짓 PASS). 본 버전은 판정 강화.
//   - 로그인 후 로그인 폼 잔존 = 로그인 실패 = 즉시 throw (전체 FAIL)
//   - 각 메뉴에서 로그인 폼 재등장 = FAIL (세션 풀림)
//   - dynamic import 실패 console error = FAIL
//   - "An error occurred" 에러 패널 = FAIL
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE = "http://127.0.0.1:9000";

const MENUS = [
  { key: "orders", url: "/app/orders", label: "Orders" },
  { key: "products", url: "/app/products", label: "Products" },
  { key: "inventory", url: "/app/inventory", label: "Inventory" },
  { key: "reservations", url: "/app/reservations", label: "Reservations" },
  { key: "customers", url: "/app/customers", label: "Customers" },
  { key: "customer-groups", url: "/app/customer-groups", label: "Customer Groups" },
  { key: "promotions", url: "/app/promotions", label: "Promotions" },
  { key: "campaigns", url: "/app/campaigns", label: "Campaigns" },
  { key: "price-lists", url: "/app/price-lists", label: "Price Lists" },
  { key: "categories", url: "/app/categories", label: "Categories" },
  { key: "collections", url: "/app/collections", label: "Collections" },
  { key: "settings", url: "/app/settings", label: "Settings" },
  { key: "settings-regions", url: "/app/settings/regions", label: "Settings → Regions" },
  { key: "settings-locations", url: "/app/settings/locations", label: "Settings → Locations" },
  { key: "settings-shipping-profiles", url: "/app/settings/shipping-profiles", label: "Settings → Shipping Profiles" },
  { key: "settings-tax-regions", url: "/app/settings/tax-regions", label: "Settings → Tax Regions" },
  { key: "settings-sales-channels", url: "/app/settings/sales-channels", label: "Settings → Sales Channels" },
  { key: "settings-users", url: "/app/settings/users", label: "Settings → Users" },
  { key: "settings-api-keys", url: "/app/settings/publishable-api-keys", label: "Settings → Publishable API Keys" },
  { key: "settings-store", url: "/app/settings/store", label: "Settings → Store" },
];

interface MenuResult {
  key: string;
  url: string;
  label: string;
  status: "PASS" | "FAIL" | "ERROR";
  navigated_to: string;
  login_form_present: boolean;
  error_panel_visible: boolean;
  error_panel_text: string | null;
  dynamic_import_error: boolean;
  has_korean: boolean;
  korean_samples: string[];
  console_errors: string[];
  network_failures: { url: string; status: number }[];
  load_ms: number;
  screenshot: string | null;
}

const screenshotDir = "/tmp/playwright-shop/screenshots/menu-walk";

// 로그인 폼이 화면에 보이는지 (= 인증 안 됨 신호)
async function isLoginFormVisible(page: any): Promise<boolean> {
  const cnt = await page.locator('input[name="email"]').count().catch(() => 0);
  if (cnt === 0) return false;
  return await page.locator('input[name="email"]').first().isVisible().catch(() => false);
}

test.describe("시나리오 99 = Admin 좌측 메뉴 전체 자동 순회 (강화판)", () => {
  test("로그인 검증 + 모든 메뉴 순회 + 엄격 에러 판정 + JSON 리포트", async ({ page }) => {
    test.setTimeout(900_000);
    fs.mkdirSync(screenshotDir, { recursive: true });

    // 1) 로그인
    await page.goto(`${BASE}/app`);
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});

    const emailInput = page.locator('input[name="email"]').first();
    await emailInput.waitFor({ state: "visible", timeout: 180_000 });
    await emailInput.fill("admin@local.test");
    await page.locator('input[name="password"]').first().fill("djemalsdlqslek12!@");
    await page.locator('button[type="submit"]').first().click();

    // 로그인 결과 대기 = /login 벗어나거나 (성공) 또는 에러 메시지 (실패)
    await page.waitForTimeout(5_000);
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

    // 로그인 직후 스크린샷 (사장님/main 눈으로 확인용)
    await page.screenshot({ path: path.join(screenshotDir, "00-login-result.png"), fullPage: true });

    const stillLogin = await isLoginFormVisible(page);
    const afterLoginUrl = page.url();
    console.log(`[99] 로그인 시도 후 URL = ${afterLoginUrl}, 로그인폼 잔존 = ${stillLogin}`);

    // §V0: 로그인 실패 시 즉시 명확 FAIL (이전 거짓 PASS 재발 방지)
    expect(stillLogin, `로그인 실패 = 로그인 폼이 여전히 보임 (URL=${afterLoginUrl}). 인증/CORS 문제 의심`).toBe(false);

    const results: MenuResult[] = [];

    // 2) 메뉴 순회
    for (const menu of MENUS) {
      const consoleErrors: string[] = [];
      const networkFailures: { url: string; status: number }[] = [];

      const consoleHandler = (msg: any) => {
        if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 500));
      };
      const responseHandler = (resp: any) => {
        const status = resp.status();
        if (status >= 400) networkFailures.push({ url: resp.url().slice(0, 300), status });
      };
      page.on("console", consoleHandler);
      page.on("response", responseHandler);

      const t0 = Date.now();
      const result: MenuResult = {
        key: menu.key, url: menu.url, label: menu.label, status: "ERROR",
        navigated_to: "", login_form_present: false, error_panel_visible: false,
        error_panel_text: null, dynamic_import_error: false,
        has_korean: false, korean_samples: [],
        console_errors: [], network_failures: [], load_ms: 0, screenshot: null,
      };

      try {
        await page.goto(`${BASE}${menu.url}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(2_000);

        result.navigated_to = page.url();
        result.load_ms = Date.now() - t0;

        // (a) 로그인 폼 재등장 = 세션 풀림 = FAIL
        result.login_form_present = await isLoginFormVisible(page);

        // (b) 에러 패널
        const errCount = await page.locator('text="An error occurred"').count();
        if (errCount > 0) {
          result.error_panel_visible = true;
          const bodyText = await page.locator("body").innerText().catch(() => "");
          const idx = bodyText.indexOf("Error Details");
          result.error_panel_text = idx >= 0 ? bodyText.slice(idx, idx + 1500) : bodyText.slice(0, 1500);
        }

        // (c) dynamic import 실패 console error
        result.dynamic_import_error = consoleErrors.some((e) =>
          e.includes("Failed to fetch dynamically imported module") || e.includes("@fs/"),
        );

        // (d) 한글 렌더 검증 (메뉴 한글화 확인)
        const bodyText = await page.locator("body").innerText().catch(() => "");
        result.has_korean = /[가-힣]/.test(bodyText);
        result.korean_samples = (bodyText.match(/[가-힣]+/g) ?? []).slice(0, 8);

        const shot = path.join(screenshotDir, `${menu.key}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        result.screenshot = shot;
        result.console_errors = consoleErrors;
        result.network_failures = networkFailures;

        // 판정 (강화 + 한글화)
        if (result.login_form_present) result.status = "FAIL";
        else if (result.error_panel_visible) result.status = "FAIL";
        else if (result.dynamic_import_error) result.status = "FAIL";
        else if (networkFailures.some((f) => f.status >= 500)) result.status = "FAIL";
        else if (!result.has_korean) result.status = "FAIL"; // 한글화 미적용 = FAIL
        else result.status = "PASS";

        console.log(`[99] ${menu.label} = ${result.status} (load=${result.load_ms}ms, login_form=${result.login_form_present}, err_panel=${result.error_panel_visible}, dyn_import_err=${result.dynamic_import_error}, korean=${result.has_korean}, net_fail=${networkFailures.length})`);
      } catch (e) {
        result.status = "ERROR";
        result.error_panel_text = (e as Error).message;
        result.console_errors = consoleErrors;
        result.network_failures = networkFailures;
        console.log(`[99] ${menu.label} = ERROR: ${(e as Error).message}`);
      } finally {
        page.off("console", consoleHandler);
        page.off("response", responseHandler);
      }
      results.push(result);
    }

    // 3) JSON 리포트
    const summary = {
      timestamp: new Date().toISOString(),
      base: BASE,
      total: results.length,
      pass: results.filter((r) => r.status === "PASS").length,
      fail: results.filter((r) => r.status === "FAIL").length,
      error: results.filter((r) => r.status === "ERROR").length,
      results,
    };
    fs.writeFileSync("/tmp/playwright-shop/menu-walk-report.json", JSON.stringify(summary, null, 2), "utf8");
    console.log(`[99] 요약 = PASS ${summary.pass} / FAIL ${summary.fail} / ERROR ${summary.error} (총 ${summary.total})`);

    expect(summary.total).toBeGreaterThan(0);
  });
});
