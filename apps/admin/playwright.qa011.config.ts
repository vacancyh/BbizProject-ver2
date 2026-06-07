/**
 * qa_011 전용 playwright 설정 (d5 t007_세금계산서 — tax-invoice 모듈 실HTTP).
 * junit outputFile = qa_011_tax_invoices.junit.xml.
 */
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["junit", { outputFile: "test-results/qa_011_tax_invoices.junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://127.0.0.1:7001",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "d5-tax-invoices",
      testMatch: "e2e/qa_011_tax_invoices.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
