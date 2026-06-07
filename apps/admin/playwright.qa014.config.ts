/**
 * qa_014 전용 playwright 설정 (d3 타임세일 — time-sale 모듈 실HTTP).
 * junit outputFile = qa_014_time_sales.junit.xml.
 */
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["junit", { outputFile: "test-results/qa_014_time_sales.junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://127.0.0.1:7001",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "d3-time-sales",
      testMatch: "e2e/qa_014_time_sales.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
