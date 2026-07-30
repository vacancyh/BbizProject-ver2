import { readFileSync } from "node:fs"
import { join } from "node:path"
import { defineConfig, devices } from "@playwright/test"

/**
 * publishable key 를 .env.local 에서 읽어 PUBKEY 로 주입한다.
 * 이전에는 스펙이 `process.env.PUBKEY!` 를 그냥 믿어, 키를 안 넘기고 전체 스위트를
 * 돌리면 **계정 생성이 조용히 실패해 무관한 지점에서 깨졌다**(실제로 겪음).
 */
if (!process.env.PUBKEY) {
  try {
    const env = readFileSync(join(__dirname, ".env.local"), "utf8")
    const m = env.match(/^NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=(.+)$/m)
    if (m) process.env.PUBKEY = m[1].trim()
  } catch {
    // .env.local 이 없으면 스펙 쪽 가드가 명확한 메시지로 실패시킨다
  }
}

/**
 * 스토어프론트 UI E2E (2026-07-28 신규)
 * - 기존 검증은 API 통합테스트(백엔드)와 SSR HTTP 200 확인까지였고,
 *   **클라이언트 하이드레이션/상호작용**은 미검증 상태였다. 그 공백을 메운다.
 * - 전제: 스토어프론트 `pnpm dev`(:8000) + 백엔드 `npx medusa develop`(:9000) 가동 중.
 *   (webServer 를 띄우지 않는 이유 = 백엔드 의존이 있어 수동 기동 전제)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["json", { outputFile: "test-results/storefront/report.json" }]],
  use: {
    baseURL: process.env.STOREFRONT_URL ?? "http://localhost:8000",
    headless: true,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "sweep",
      testMatch: "e2e/storefront-sweep.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "interactions",
      testMatch: "e2e/storefront-interactions.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "checkout",
      testMatch: "e2e/storefront-checkout.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "feedback",
      testMatch: ["e2e/storefront-feedback.spec.ts", "e2e/storefront-password.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // 접근성(axe) — critical/serious 위반 0 을 게이트로
      name: "a11y",
      testMatch: "e2e/storefront-a11y.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // 모바일 반응형 — 실제 모바일 뷰포트/터치 에뮬레이션
      name: "mobile",
      testMatch: "e2e/storefront-mobile.spec.ts",
      use: { ...devices["Pixel 7"] },
    },
  ],
})
