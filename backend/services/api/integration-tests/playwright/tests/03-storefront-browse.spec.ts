// 시나리오 3 = Storefront 진열
// 1) Store API 통해 상품 list 가 publishable key 로 조회되는지 확인
// 2) Storefront UI 접속 + screenshot
import { test, expect } from "@playwright/test";
import { storeGet, STOREFRONT_URL } from "../helpers/api";

test.describe("시나리오 3 = Storefront 진열", () => {
  test("Storefront 홈 접속 + Store API 상품 조회", async ({ page }) => {
    // 1) Store API 로 상품 list 직접 조회
    const apiRes = await storeGet("/store/products?limit=20");
    expect(
      apiRes.ok(),
      `/store/products 조회 실패 status=${apiRes.status()}`,
    ).toBeTruthy();
    const apiJson = await apiRes.json();
    const products = apiJson.products ?? [];
    console.log(`[시나리오 3] Store API 상품 수 = ${products.length}`);
    const targetExists = products.some((p: any) => p.title === "테스트 상품 001");
    console.log(`[시나리오 3] "테스트 상품 001" Store API 노출 = ${targetExists}`);

    // 2) Storefront UI 접속
    const resp = await page.goto(STOREFRONT_URL + "/", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    }).catch(() => null);
    console.log(`[시나리오 3] storefront 응답 status = ${resp?.status()}`);
    await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});

    const bodyText = await page.locator("body").innerText().catch(() => "");
    console.log(`[시나리오 3] storefront body 길이 = ${bodyText.length}`);

    await page.screenshot({
      path: "/tmp/playwright-shop/screenshots/03-storefront-product.png",
      fullPage: true,
    });

    expect(products.length, "Store API 가 1개 이상의 상품을 반환해야 합니다").toBeGreaterThanOrEqual(1);
  });
});
