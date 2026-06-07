import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "e2e/**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    // qa_001 실행 시 --reporter 옵션으로 오버라이드 가능.
    // 기본 outputFile 은 qa_011 전용으로 유지 (기존 결과 보존).
    ["junit", { outputFile: "test-results/qa_011_junit.xml" }],
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
      name: "qa-011",
      testMatch: "e2e/qa_011.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "qa-001",
      testMatch: "e2e/qa_001.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "qa-002",
      testMatch: "e2e/qa_002.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer는 띄우지 않음 (이미 7002 가동중)
});
