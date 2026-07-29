// 고객 화면에 노출되는 **테스트 잔여 데이터** 정리 (2026-07-29 신설)
//
// 배경: E2E·QA 자동화가 반복 실행되면서 카테고리("QA004 …")와 인기 검색어("검증어1782963891" 등)가
//       쌓여 **실제 쇼핑몰 화면에 그대로 노출**됐다. 판매 개시 전 정리가 필요하다.
//
// 실행:
//   npx medusa exec ./src/scripts/cleanup-test-data.ts            # 미리보기(기본, 아무것도 지우지 않음)
//   CLEANUP_APPLY=true npx medusa exec ./src/scripts/cleanup-test-data.ts   # 실제 삭제
//
// 안전장치:
//  - 기본은 **dry-run**. 지울 목록만 출력한다.
//  - 보수적 패턴만 지운다(자동화가 만든 흔적). 시드된 데모 데이터는 건드리지 않는다.
//  - 판단이 애매한 항목(예: "상의(kr-test)" 같은 시드 카테고리, 테스트 계정)은 **보고만** 한다.
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_CURATION_MODULE } from "../modules/product-curation"

const APPLY = process.env.CLEANUP_APPLY === "true"

/**
 * 자동화가 만든 카테고리 판정.
 * handle 뿐 아니라 **이름**도 본다 — 한글 handle(예: "qa점검카테고리")이 있어
 * handle 패턴만으로는 놓친다(실제로 놓쳤음).
 */
const QA_CATEGORY = /^qa/i
/** 10자리 이상 숫자(타임스탬프)가 붙은 검색어 = 테스트 흔적 */
const TIMESTAMPED = /\d{10,}/
/** 프로브가 남긴 검색어 */
const JUNK_TERMS = ["절대없는검색어zzq123"]
/** 자동화 계정 도메인(보고만) */
const TEST_EMAIL_DOMAINS = [
  "@kr-audit.local",
  "@kr-e2e.local",
  "@kr-itest.local",
  "@kr-smoke.local",
  "@kr-verify.local",
]

export default async function cleanupTestData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info(`[cleanup] 시작 ${APPLY ? "(APPLY — 실제 삭제)" : "(미리보기 — 삭제하지 않음)"}`)

  // ── 1. QA 자동생성 카테고리 ────────────────────────────────────────────────
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle"],
  })
  const qaCategories = (categories ?? []).filter(
    (c: any) =>
      QA_CATEGORY.test(String(c.handle ?? "")) || QA_CATEGORY.test(String(c.name ?? ""))
  )
  logger.info(`[cleanup] QA 자동생성 카테고리: ${qaCategories.length}건`)
  for (const c of qaCategories.slice(0, 5)) {
    logger.info(`           - ${c.name} (${c.handle})`)
  }
  if (qaCategories.length > 5) logger.info(`           … 외 ${qaCategories.length - 5}건`)

  if (APPLY && qaCategories.length) {
    const productModule = container.resolve(Modules.PRODUCT) as any
    await productModule.deleteProductCategories(qaCategories.map((c: any) => c.id))
    logger.info(`[cleanup] 카테고리 ${qaCategories.length}건 삭제 완료`)
  }

  // ── 2. 테스트 인기 검색어 ─────────────────────────────────────────────────
  const curation = container.resolve(PRODUCT_CURATION_MODULE) as any
  const terms: any[] = await curation.listPopularSearchTerms({})
  const junk = terms.filter(
    (t) => TIMESTAMPED.test(String(t.term ?? "")) || JUNK_TERMS.includes(String(t.term ?? ""))
  )
  logger.info(`[cleanup] 테스트 검색어: ${junk.length}건 / 전체 ${terms.length}건`)
  for (const t of junk.slice(0, 8)) logger.info(`           - "${t.term}" (count=${t.count})`)

  if (APPLY && junk.length) {
    await curation.deletePopularSearchTerms(junk.map((t) => t.id))
    logger.info(`[cleanup] 검색어 ${junk.length}건 삭제 완료`)
  }

  // ── 3. 보고만 — 판단이 필요한 항목 ────────────────────────────────────────
  const seedTestCategories = (categories ?? []).filter((c: any) =>
    String(c.name ?? "").includes("kr-test")
  )
  if (seedTestCategories.length) {
    logger.info(
      `[cleanup] ⚠️ 이름에 'kr-test' 가 붙은 시드 카테고리 ${seedTestCategories.length}건 — ` +
        `고객 화면에 그대로 노출됩니다. 실제 카테고리명으로 바꾸거나 숨기세요.`
    )
    for (const c of seedTestCategories) logger.info(`           - ${c.name} (${c.handle})`)
  }

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
  })
  const testCustomers = (customers ?? []).filter((c: any) =>
    TEST_EMAIL_DOMAINS.some((d) => String(c.email ?? "").endsWith(d))
  )
  if (testCustomers.length) {
    logger.info(
      `[cleanup] ⚠️ 자동화가 만든 테스트 계정 ${testCustomers.length}건 — ` +
        `주문·적립금이 얽혀 있을 수 있어 자동 삭제하지 않습니다(운영 이관 시 별도 판단).`
    )
  }

  logger.info(
    APPLY
      ? "[cleanup] 완료."
      : "[cleanup] 미리보기 종료 — 실제로 지우려면 CLEANUP_APPLY=true 로 다시 실행하세요."
  )
}
