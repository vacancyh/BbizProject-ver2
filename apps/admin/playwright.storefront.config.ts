import { defineConfig, devices } from "@playwright/test"

// 스토어프론트(apps/web :8000) 전용 E2E — 관리자 storageState 미사용.
export default defineConfig({
  testDir: "./e2e-storefront",
  testMatch: "e2e-storefront/**/*.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 90000,
  reporter: [["list"]],
  outputDir: "test-results/storefront",
  use: {
    baseURL: "http://localhost:8000",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    { name: "storefront", use: { ...devices["Desktop Chrome"] } },
  ],
})
