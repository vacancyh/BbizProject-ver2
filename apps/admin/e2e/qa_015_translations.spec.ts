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

    // ⚠️ 이미 들어 있는 영어 번역을 기억해 둔다.
    // 2026-08-11 부터 `seed-content-en.ts` 가 확인용 영어값을 넣어 두므로
    // 여기서 무턱대고 비우면 **시드된 번역을 지워 버린다**(실제로 그래서 실패했다).
    // 끝나면 원래 값으로 되돌린다.
    const priorEn = await titleInput().inputValue()

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

    // ── 뒷정리: 원래 값으로 되돌린다 ─────────────────────────────────────
    // 안 되돌리면 **실제 상품에 "QA English Title …" 이 남아** 영어 고객에게 그대로 보인다.
    // (2026-08-06 실측: 이전 실행분이 상품 목록에 남아 있었다)
    // 되돌리는 것도 화면에서 하므로 "번역 수정/삭제" 경로까지 함께 검증된다.
    await tabs().nth(1).click()
    await titleInput().fill(priorEn)
    // 입력 반영(React 상태)이 끝난 뒤 저장을 눌러야 한다.
    // 바로 누르면 되돌리기 전 값으로 저장돼 복구가 안 된다.
    await expect(titleInput()).toHaveValue(priorEn)
    await dlg.getByRole("button", { name: "변경사항 저장" }).click()
    await expect(page.locator('[data-testid="toast"]').first()).toBeVisible({ timeout: 20_000 })

    // 저장 후 컴포넌트가 스스로 다시 읽으므로 제자리에서 확인한다.
    // (닫았다 다시 여는 방식은 토스트·재렌더와 겹쳐 불안정했다)
    await expect(titleInput()).toHaveValue(priorEn, { timeout: 15_000 })

    // 원래 번역이 없던 상품이었다면, 비운 뒤 미입력 표시(•)가 다시 붙어야 한다
    // = 번역 레코드가 실제로 지워졌다는 화면 근거.
    // 번역이 있던 상품이라면 표시가 없는 게 맞다(비우지 않았으므로).
    if (!priorEn) {
      await expect(tabs().nth(1)).toContainText("•", { timeout: 10_000 })
    }

    // 원문은 끝까지 그대로
    await tabs().first().click()
    await expect(titleInput()).toHaveValue(baseTitle)
  })
})
