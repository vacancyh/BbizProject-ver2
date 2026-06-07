/**
 * qa_002 전용 playwright 설정 (d2_주문관리 QA-001).
 * junit outputFile = qa_002_batch1.junit.xml — d2 batch1 식별자 포함, 기존 결과 덮어쓰기 방지.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["junit", { outputFile: "test-results/qa_002_batch1.junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://localhost:7002",
    headless: true,
    trace: "retain-on-failure",
    storageState: "e2e/.auth/state.json",
  },
  projects: [
    {
      name: "setup",
      testMatch: "e2e/global-setup.spec.ts",
      use: { ...devices["Desktop Chrome"], storageState: undefined },
    },
    {
      name: "d2-batch1",
      testMatch: "e2e/qa_002.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer는 띄우지 않음 (이미 7002 가동중)
});
