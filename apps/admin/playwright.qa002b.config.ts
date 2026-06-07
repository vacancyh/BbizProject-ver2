/**
 * qa_002 batch3 전용 playwright 설정 (d2_주문관리 QA-007~010).
 * junit outputFile = qa_002_batch3.junit.xml — batch1(QA-001)·기존 결과 덮어쓰기 방지.
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
    ["junit", { outputFile: "test-results/qa_002_batch3.junit.xml" }],
    ["list"],
  ],
  use: {
    baseURL: "http://127.0.0.1:7001",
    headless: true,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "d2-batch3",
      testMatch: "e2e/qa_002_batch3.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer는 띄우지 않음 (백엔드 7001 가동중 전제)
});
