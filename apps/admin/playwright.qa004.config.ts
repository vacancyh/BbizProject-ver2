/**
 * qa_004 전용 playwright 설정 (d4_카테고리 QA-001/004).
 * junit outputFile = qa_004_categories.junit.xml.
 * request fixture 직접 호출(7001) 기반이라 storageState·setup project 불필요.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["junit", { outputFile: "test-results/qa_004_categories.junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://127.0.0.1:7001",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "d4-categories",
      testMatch: "e2e/qa_004_categories.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer는 띄우지 않음 (백엔드 7001 가동중 전제)
});
