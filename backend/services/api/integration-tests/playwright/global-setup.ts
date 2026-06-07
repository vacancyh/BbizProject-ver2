// Playwright global setup
// backend dev server 가 hot-reload 로 자주 재시작되므로 시작 전 health check 로 wait 합니다.
// Docker 환경 = admin UI vite lazy chunks 컴파일 시간 매우 길어 warm-up 추가합니다.
import http from "http";
import { chromium } from "@playwright/test";

const TARGETS = [
  { name: "backend", url: "http://127.0.0.1:9000/health", expect: 200 },
  { name: "storefront", url: "http://127.0.0.1:8000/", expect: [200, 307, 308] },
];

function ping(url: string): Promise<number> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode ?? 0);
      res.resume();
    });
    req.setTimeout(5_000, () => {
      req.destroy();
      resolve(0);
    });
    req.on("error", () => resolve(0));
  });
}

async function waitUntilHealthy(name: string, url: string, expect: number | number[]) {
  const expects = Array.isArray(expect) ? expect : [expect];
  const start = Date.now();
  let last = 0;
  while (Date.now() - start < 60_000) {
    const status = await ping(url);
    last = status;
    if (expects.includes(status)) {
      console.log(`[global-setup] ${name} OK status=${status} (${Date.now() - start}ms)`);
      return;
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`[global-setup] ${name} health check timeout (last status=${last})`);
}

export default async function globalSetup() {
  for (const t of TARGETS) {
    await waitUntilHealthy(t.name, t.url, t.expect);
  }

  // Admin UI vite chunks warm-up (Docker 환경 첫 빌드 = 1~3분 소요)
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    console.log(`[global-setup] admin UI warm-up 시작 (vite chunks 컴파일)`);
    const t0 = Date.now();
    await page.goto("http://127.0.0.1:9000/app", { waitUntil: "domcontentloaded", timeout: 180_000 });
    // email input 이 보일 때까지 = vite chunks 컴파일 + React mount 완료
    await page.locator('input[name="email"]').first().waitFor({ state: "visible", timeout: 180_000 });
    console.log(`[global-setup] admin UI warm-up 완료 (${Date.now() - t0}ms)`);
  } catch (e) {
    console.warn(`[global-setup] admin UI warm-up 실패 (시나리오 1 에서 재시도) = ${(e as Error).message}`);
  } finally {
    await browser.close();
  }
}
