/**
 * qa_008 전용 playwright 설정 (d5 t004_멤버십등급 — membership 모듈 실HTTP).
 * junit outputFile = qa_008_membership.junit.xml.
 */
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["junit", { outputFile: "test-results/qa_008_membership.junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://127.0.0.1:7001",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "d5-membership",
      testMatch: "e2e/qa_008_membership.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer는 띄우지 않음 (백엔드 7001 가동중 전제)
})
