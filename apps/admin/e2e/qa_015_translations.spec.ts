/**
 * QA-015 — 상품 다국어 입력 (2026-08-05 신설)
 *
 * 왜 테스트가 필요한가:
 * 이 화면의 언어 탭(KR/EN/JP)은 원래 **눌러도 아무 일이 없는 껍데기**였다.
 * 화면상 멀쩡해 보여서 아무도 몰랐다. 같은 일이 다시 생기지 않도록,
 * "탭을 눌러 영어를 넣고 저장하면 실제로 남는가"를 끝까지 확인한다.
 *
 * 전제: 백엔드 번역 모듈 활성화 + 스토어 지원 언어에 한국어·영어 지정
 *       cd backend/services/api && npx medusa exec ./src/scripts/setup-translation.ts
 *
 * ⚠️ 선택자 주의
 *  · `.lang-tab` 클래스는 **상품 목록의 상태 필터 칩도 쓴다.** 드로어 밖까지 잡히면
 *    엉뚱한 칩을 눌러 조용히 실패한다 → 반드시 `[role="dialog"]` 안으로 한정할 것.
 *  · 드로어 안에 "저장" 버튼이 여러 개다(가격·재고 패널) → 정확한 이름으로 집을 것.
 */
import { test, expect } from "@playwright/test"

test.describe("QA-015 상품 다국어 입력", () => {
  test("언어 탭으로 영어 상품명을 넣고 저장하면 유지된다", async ({ page }) => {
    await page.goto("/products")
    await page.waitForLoadState("networkidle")

    const openFirstProduct = async () => {
      const row = page.locator("table tbody tr").first()
      await expect(row).toBeVisible({ timeout: 30_000 })
      await row.click()
      const dlg = page.locator("[role='dialog']").first()
      await expect(dlg).toBeVisible({ timeout: 15_000 })
      // 번역 탭이 뜰 때까지 = 지원 언어 로딩 완료
      await expect(
        dlg.getByTestId("translation-lang-tabs").locator(".lang-tab").first()
      ).toBeVisible({ timeout: 15_000 })
      return dlg
    }

    let dlg = await openFirstProduct()
    const tabs = () => dlg.getByTestId("translation-lang-tabs").locator(".lang-tab")
    const titleInput = () =>
      dlg.locator(".frow").filter({ hasText: "상품명" }).locator("input").first()

    // 지원 언어가 2개 이상이어야 다국어 입력이 의미가 있다
    expect(await tabs().count()).toBeGreaterThanOrEqual(2)

    // 기본 언어(첫 탭) 원문
    const baseTitle = await titleInput().inputValue()
    expect(baseTitle.length).toBeGreaterThan(0)

    // ── 두 번째 언어로 전환 ──────────────────────────────────────────────
    const stamp = Date.now()
    const enTitle = `QA English Title ${stamp}`
    await tabs().nth(1).click()

    // 탭이 실제로 문맥을 바꿨는지: 값이 원문 그대로면 껍데기(예전 버그),
    // placeholder 에 원문이 뜨면 번역 입력 상태라는 증거
    await expect(titleInput()).not.toHaveValue(baseTitle)
    await expect(titleInput()).toHaveAttribute("placeholder", `원문: ${baseTitle}`)

    await titleInput().fill(enTitle)
    await dlg.getByRole("button", { name: "변경사항 저장" }).click()

    const toast = page.locator('[data-testid="toast"]').first()
    await expect(toast).toBeVisible({ timeout: 20_000 })
    await expect(toast).not.toHaveAttribute("data-variant", "danger")

    // ── 닫았다 다시 열어도 남아 있는가 ───────────────────────────────────
    await dlg.getByRole("button", { name: "닫기" }).first().click()
    await expect(page.locator("[role='dialog']")).toHaveCount(0, { timeout: 10_000 })

    dlg = await openFirstProduct()
    await tabs().nth(1).click()
    await expect(titleInput()).toHaveValue(enTitle, { timeout: 15_000 })

    // ── 원문이 번역으로 덮이지 않았는가 ──────────────────────────────────
    // 번역이 원본을 덮으면 한국어 고객에게 영어가 보인다 — 가장 큰 사고다.
    await tabs().first().click()
    await expect(titleInput()).toHaveValue(baseTitle)
  })
})
