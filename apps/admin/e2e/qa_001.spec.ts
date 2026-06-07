/**
 * QA-001 — d1_대시보드 연계 검증 (2 케이스)
 *
 * 검증 경계:
 *  - QA-001: 위젯 클릭 → 도메인 목록 진입 (처리필요업무 카드 route 이동 + API 실왕복)
 *  - QA-002: 정산 KPI 위젯 실왕복 (/admin/dashboard/settlement-kpi 200) + 위젯 표시
 *
 * 메타룰 v2 준수:
 *  - 거짓 PASS 금지: 모든 케이스에서 실제 API 응답(waitForResponse + status === 200) 단언
 *  - 화면 요소 존재만 확인하는 얕은 통과 금지
 *  - d7 미구현이라 KPI 값 0/빈이어도 정상 (spec: 0건 빈 위젯 허용)
 */
import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────────────────────────────────────
// 공통 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

/** 로딩 스피너(불러오는 중) 사라질 때까지 대기 */
async function waitForLoad(page: any, ms = 8000) {
  try {
    await page.waitForFunction(
      () => !document.body.innerText.includes("불러오는 중"),
      { timeout: ms }
    );
  } catch {
    // 로딩 텍스트 없을 수도 있음 — 무시
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 테스트 스위트
// ─────────────────────────────────────────────────────────────────────────────

test.describe("QA-001 d1_대시보드 연계 검증", () => {

  /**
   * QA-001 — 위젯 클릭 → 도메인 목록 진입
   *
   * 시나리오:
   *  1. /dashboard 진입(storageState 로그인)
   *  2. 위젯 로드 API 실왕복 확인:
   *     - /admin/orders → 200
   *  3. 처리필요업무 카드('결제 대기' 또는 '배송 준비') 클릭
   *  4. URL이 해당 도메인(/orders 또는 /shipping)으로 이동했는지 단언
   *  5. 목록 화면 핵심 요소 도달 확인
   */
  test("QA-001 위젯 클릭 → 도메인 목록 진입", async ({ page }) => {
    // 1. /dashboard 진입 전에 /admin/orders 응답 대기 Promise 미리 등록
    //    (진입 후 등록하면 타이밍상 응답을 놓칠 수 있음)
    const ordersResponsePromise = page.waitForResponse(
      (r: any) =>
        r.url().includes("/admin/orders") &&
        !r.url().includes("/admin/orders/") && // 단일 주문 상세 제외
        r.status() === 200,
      { timeout: 20000 }
    );

    // 2. /dashboard 진입
    await page.goto("/dashboard");

    // 3. /admin/orders API 실왕복 단언 (status 200)
    const ordersResponse = await ordersResponsePromise;
    expect(ordersResponse.status()).toBe(200); // ★ 실왕복 단언 라인

    // 4. 대시보드 로딩 완료 대기
    await waitForLoad(page, 15000);

    // 5. 대시보드 헤더 "오늘 운영 현황" 존재 확인
    await expect(page.locator("h1")).toContainText("오늘 운영 현황", { timeout: 10000 });

    // 6. 처리 필요 업무 섹션 타이틀 확인
    await expect(page.getByText("처리 필요 업무")).toBeVisible({ timeout: 8000 });

    // 7. 처리필요업무 카드 로드 대기 (ap-card 클래스)
    const apCards = page.locator(".ap-card");
    await expect(apCards.first()).toBeVisible({ timeout: 10000 });
    const cardCount = await apCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);

    // 8. '결제 대기' 카드 우선, 없으면 '배송 준비' 카드 클릭
    const awaitCard = page.locator(".ap-card").filter({ hasText: "결제 대기" }).first();
    const shipCard = page.locator(".ap-card").filter({ hasText: "배송 준비" }).first();

    const hasAwait = await awaitCard.isVisible({ timeout: 3000 }).catch(() => false);
    const hasShip = await shipCard.isVisible({ timeout: 3000 }).catch(() => false);

    // 최소 1개는 존재해야 함
    expect(hasAwait || hasShip).toBeTruthy();

    const targetCard = hasAwait ? awaitCard : shipCard;
    const expectedUrlPattern = hasAwait ? /\/orders/ : /\/shipping/;

    // 9. 카드 클릭 → URL 이동 단언
    await targetCard.click();

    // 10. URL이 /orders 또는 /shipping으로 이동했는지 단언
    await expect(page).toHaveURL(expectedUrlPattern, { timeout: 10000 }); // ★ URL 이동 단언 라인

    // 11. 목록 화면 핵심 요소 도달 확인 (h1 존재)
    await waitForLoad(page, 8000);
    const currentUrl = page.url();

    if (currentUrl.includes("/orders")) {
      // 주문 목록: h1에 "주문" 텍스트 또는 테이블 행 존재
      const hasOrderH1 = await page.locator("h1").filter({ hasText: /주문/ }).isVisible({ timeout: 8000 }).catch(() => false);
      const hasTable = await page.locator("table, .order-list, .dline").first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.getByText(/주문이 없/i).isVisible({ timeout: 3000 }).catch(() => false);
      // h1이 있거나 테이블이 있거나 empty state가 있으면 목록 화면 도달
      expect(hasOrderH1 || hasTable || hasEmptyState).toBeTruthy();
    } else if (currentUrl.includes("/shipping")) {
      // 배송 목록: h1 또는 목록 요소 존재
      const hasShipH1 = await page.locator("h1").isVisible({ timeout: 8000 }).catch(() => false);
      const hasContent = await page.locator("table, .ship-list, .dline").first().isVisible({ timeout: 5000 }).catch(() => false);
      const hasEmptyState = await page.getByText(/배송.*없/i).isVisible({ timeout: 3000 }).catch(() => false);
      expect(hasShipH1 || hasContent || hasEmptyState).toBeTruthy();
    } else {
      // 기타 경로 — URL 이동 자체가 이미 단언됨
      expect(currentUrl).toMatch(expectedUrlPattern);
    }
  });

  /**
   * QA-002 — 정산 집계(d7) → KPI 위젯 반영
   *
   * 시나리오:
   *  1. /dashboard 진입(storageState 로그인)
   *  2. settlement-kpi route 실왕복 단언:
   *     - /admin/dashboard/settlement-kpi → 200
   *     - 응답 본문에 kpi(sales/refund/net 등) + alerts 구조 존재 단언
   *  3. 정산 현황 위젯(data-testid="settlement-kpi") 가시 단언
   *  4. 순정산/보류 등 항목 텍스트 존재 단언
   *
   * 참고: d7 미구현이라 값은 0/빈이어도 OK (spec: 0건 빈 위젯 허용)
   */
  test("QA-002 정산 집계 → KPI 위젯 반영", async ({ page }) => {
    // 1. /dashboard 진입 전 settlement-kpi 응답 대기 Promise 미리 등록
    const settlementKpiPromise = page.waitForResponse(
      (r: any) =>
        r.url().includes("/admin/dashboard/settlement-kpi") &&
        r.status() === 200,
      { timeout: 20000 }
    );

    // 2. /dashboard 진입
    await page.goto("/dashboard");

    // 3. /admin/dashboard/settlement-kpi 실왕복 단언 (status 200)
    const settlementKpiResponse = await settlementKpiPromise;
    expect(settlementKpiResponse.status()).toBe(200); // ★ 실왕복 단언 라인

    // 4. 응답 본문 구조 단언 (kpi + alerts 존재)
    const kpiBody = await settlementKpiResponse.json();
    expect(kpiBody).toBeDefined();
    expect(kpiBody.kpi).toBeDefined();                     // kpi 객체 존재
    expect(typeof kpiBody.kpi.sales).toBe("number");       // kpi.sales 숫자 타입
    expect(typeof kpiBody.kpi.refund).toBe("number");      // kpi.refund 숫자 타입
    expect(typeof kpiBody.kpi.net).toBe("number");         // kpi.net 숫자 타입
    expect(Array.isArray(kpiBody.alerts)).toBe(true);      // alerts 배열 존재

    // 5. 대시보드 로딩 완료 대기
    await waitForLoad(page, 15000);

    // 6. 정산 현황 위젯 가시 단언 (data-testid="settlement-kpi")
    const settlementWidget = page.locator('[data-testid="settlement-kpi"]');
    await expect(settlementWidget).toBeVisible({ timeout: 10000 }); // ★ 위젯 가시 단언 라인

    // 7. 위젯 타이틀 "정산 현황" 존재 단언
    await expect(settlementWidget.getByText("정산 현황")).toBeVisible({ timeout: 5000 });

    // 8. KPI 항목 텍스트 존재 단언 (매출/환불/PG수수료/순정산/보류)
    // 위젯 내에서 각 항목 라벨 텍스트 확인
    const kpiLabels = ["매출", "환불", "PG 수수료", "순정산", "보류"];
    for (const label of kpiLabels) {
      await expect(settlementWidget.getByText(label)).toBeVisible({ timeout: 5000 });
    }

    // 9. KPI 값 표시 확인 (₩ 포함 값 또는 0 표시)
    //    d7 미구현이라 ₩0이어도 정상 — 값 렌더 자체 확인
    const kpiValues = settlementWidget.locator(".k-val");
    await expect(kpiValues.first()).toBeVisible({ timeout: 5000 });
    const kpiValueCount = await kpiValues.count();
    expect(kpiValueCount).toBeGreaterThanOrEqual(5); // 5개 항목 모두 렌더

    // 10. 경보 배지 또는 "경보 없음" 텍스트 중 하나 존재 (빈 alerts 배열 정상)
    const hasAlerts = await settlementWidget.locator(".ap-card").first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasNoAlert = await settlementWidget.getByText("경보 없음").isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasAlerts || hasNoAlert).toBeTruthy();
  });

});
