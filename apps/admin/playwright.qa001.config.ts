/**
 * qa_001 전용 playwright 설정.
 * junit outputFile 을 qa_001_junit.xml 로 분리 — qa_011 기존 결과를 덮어쓰지 않음.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["junit", { outputFile: "test-results/qa_001_junit.xml" }],
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
      name: "qa-001",
      testMatch: "e2e/qa_001.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
