import { defineConfig, devices } from "@playwright/test"

/**
 * 스토어프론트 UI E2E (2026-07-28 신규)
 * - 기존 검증은 API 통합테스트(백엔드)와 SSR HTTP 200 확인까지였고,
 *   **클라이언트 하이드레이션/상호작용**은 미검증 상태였다. 그 공백을 메운다.
 * - 전제: 스토어프론트 `pnpm dev`(:8000) + 백엔드 `npx medusa develop`(:9000) 가동 중.
 *   (webServer 를 띄우지 않는 이유 = 백엔드 의존이 있어 수동 기동 전제)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/storefront/report.json" }]],
  use: {
    baseURL: process.env.STOREFRONT_URL ?? "http://localhost:8000",
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "sweep",
      testMatch: "e2e/storefront-sweep.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "interactions",
      testMatch: "e2e/storefront-interactions.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "checkout",
      testMatch: "e2e/storefront-checkout.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
