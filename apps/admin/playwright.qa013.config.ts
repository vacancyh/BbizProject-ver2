/**
 * qa_013 전용 playwright 설정 (d7 정산 payout — settlement-payout 모듈 실HTTP).
 * junit outputFile = qa_013_settlement_payout.junit.xml.
 */
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["junit", { outputFile: "test-results/qa_013_settlement_payout.junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://127.0.0.1:7001",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "d7-settlement-payout",
      testMatch: "e2e/qa_013_settlement_payout.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
