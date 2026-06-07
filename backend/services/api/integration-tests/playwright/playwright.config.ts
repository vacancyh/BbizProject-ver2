// shop 메두사 풀테스트 Playwright 설정 파일입니다.
// 모든 시나리오는 headless 모드로 실행되며, 실패 시에만 스크린샷을 저장합니다.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // Docker 안 admin UI vite lazy build 대응 = 시나리오 1 첫 빌드 90초+
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 2,
  globalSetup: require.resolve("./global-setup.ts"),
  // ISS-001 fix: 메두사 dev server file-watcher 트리거 회피 위해 산출물 외부 이동
  outputDir: "/tmp/playwright-shop/test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "/tmp/playwright-shop/report" }],
    ["json", { outputFile: "/tmp/playwright-shop/results.json" }],
  ],
  use: {
    headless: true,
    baseURL: "http://127.0.0.1:9000",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    video: "off",
    trace: "retain-on-failure",
    extraHTTPHeaders: {
      // 메두사 storefront publishable key 입니다.
      "x-publishable-api-key":
        "pk_25491a52e11d5a5d9b52344d3f0bdaaea3bd7d3d3a9b27edda84b1287147ccb4",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
