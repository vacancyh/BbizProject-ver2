/**
 * qa_005 전용 playwright 설정 (d5_회원관리 — 고객/고객그룹 코어 워크플로우).
 * junit outputFile = qa_005_members.junit.xml.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ["junit", { outputFile: "test-results/qa_005_members.junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://127.0.0.1:7001",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "d5-members",
      testMatch: "e2e/qa_005_members.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer는 띄우지 않음 (백엔드 7001 가동중 전제)
});
