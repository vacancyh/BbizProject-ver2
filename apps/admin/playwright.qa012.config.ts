/**
 * qa_012 전용 playwright 설정 (d5 t008_동의이력 — customer-consent 모듈 실HTTP).
 * junit outputFile = qa_012_consents.junit.xml.
 */
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["junit", { outputFile: "test-results/qa_012_consents.junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://127.0.0.1:7001",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "d5-consents",
      testMatch: "e2e/qa_012_consents.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
