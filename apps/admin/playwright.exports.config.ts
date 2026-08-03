import { defineConfig, devices } from "@playwright/test"

/**
 * 관리자 자료 내보내기 E2E 전용 설정 (2026-08-03 신설)
 * 전제: 어드민 :7002 + 백엔드 :9000 가동 중.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "e2e/admin-exports.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:7002",
    headless: true,
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "exports", use: { ...devices["Desktop Chrome"] } }],
})
