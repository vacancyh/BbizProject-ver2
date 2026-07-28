import { defineConfig, devices } from "@playwright/test"

/**
 * QA 시나리오 스위트 전용 설정 (2026-07-28 신설)
 *
 * 배경: e2e/ 에 QA 스펙이 20개 있었지만 playwright.config.ts 에는 3개(qa_001/002/011)만
 * 등록돼 있어 나머지는 사실상 방치 상태였다. 전부 한 번에 돌릴 수 있게 별도 설정으로 묶는다.
 *
 * 전제: 백엔드 :9000, 어드민 :7002 기동.
 * 실행: pnpm test:qa            (전체)
 *       pnpm test:qa qa_005     (파일명 필터)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/qa/report.json" }]],
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
      name: "qa",
      testMatch: /e2e[\\/](qa_0\d+.*|menu-click)\.spec\.ts$/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
