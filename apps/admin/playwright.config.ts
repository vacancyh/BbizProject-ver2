import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "e2e/**/*.spec.ts",
  /**
   * 테스트 하나당 제한 시간.
   *
   * Playwright 기본값은 30초인데, 22개 스펙을 **순차로** 15분 넘게 돌리는 동안
   * dev 서버가 느려져 30초를 넘기는 테스트가 나온다. 단독으로 돌리면 같은 테스트가
   * 15초대에 끝난다(2026-08-11 실측: QA-001 15.7s · QA-015 14.8s · 전체 실행 시 둘 다 타임아웃).
   * 로직 문제가 아니라 시간 문제이므로 여유를 준다 — 진짜 실패는 여전히 잡힌다.
   */
  timeout: 90_000,
  /**
   * 단정(expect) 기본 대기 — 스토어프론트 설정과 같게 맞춘다(apps/web 은 이미 15초).
   * 전체 실행 중 대시보드 위젯 클릭 후 이동이 10초를 넘긴 적이 있다
   * (단독 실행 6.3초 · 2026-08-11 실측). 개별 단정에 명시된 timeout 은 그 값이 이긴다.
   */
  expect: { timeout: 15_000 },
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
  /**
   * ⚠️ 예전에는 프로젝트마다 `testMatch` 로 **파일 하나씩** 등록했다.
   * 그래서 e2e 폴더에 22개가 있는데 `npx playwright test` 는 3개만 돌았고,
   * 나머지 19개는 **한 번도 자동 실행되지 않았다**(2026-08-11 발견).
   * 등록을 빠뜨렸다는 사실조차 드러나지 않는 구조였다 — 파일을 지정해 돌리면
   * 어느 프로젝트에도 안 걸려 "No tests found" 가 뜬다.
   *
   * 이제 `qa` 프로젝트 하나가 **global-setup 을 뺀 전부**를 잡는다.
   * 새 스펙을 추가하면 등록 없이 바로 돌아간다.
   */
  projects: [
    {
      name: "setup",
      testMatch: "e2e/global-setup.spec.ts",
      use: { ...devices["Desktop Chrome"], storageState: undefined },
    },
    {
      name: "qa",
      testMatch: "e2e/**/*.spec.ts",
      testIgnore: "e2e/global-setup.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer는 띄우지 않음 (이미 7002 가동중)
});
