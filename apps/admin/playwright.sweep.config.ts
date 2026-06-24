import { defineConfig, devices } from "@playwright/test"

// 전 화면 헬스 스윕 전용 설정 (기존 playwright.config.ts 와 분리)
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60000,
  reporter: [["list"], ["json", { outputFile: "test-results/sweep/report.json" }]],
  use: {
    baseURL: "http://localhost:7002",
    headless: true,
    trace: "retain-on-failure",
    storageState: "e2e/.auth/state.json",
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: "setup",
      testMatch: "e2e/global-setup.spec.ts",
      use: { ...devices["Desktop Chrome"], storageState: undefined },
    },
    {
      name: "sweep",
      testMatch: "e2e/qa_health_sweep.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "interactions",
      testMatch: "e2e/qa_interactions.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
