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
import { updateProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"
import { resolveRevalidateTarget } from "../subscribers/revalidate-contract"
import { PRODUCT_CURATION_MODULE } from "../modules/product-curation"
import { LEGAL_DOC_MODULE } from "../modules/legal-kr/legal-doc"

const APPLY = process.env.CLEANUP_APPLY === "true"
/** 시드 카테고리 이름에서 "(kr-test)" 표기를 떼어낼지(운영 이관용) */
const RENAME_SEED = process.env.CLEANUP_RENAME_TEST_CATEGORIES === "true"

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
/**
 * 시드 카테고리 한글명 → ASCII handle.
 * 한글 handle 은 URL 인코딩된 채로 라우트에 들어와 **카테고리 페이지가 404** 가 된다(실제로 겪음).
 * 표시 이름은 한글로 두고 주소만 ASCII 로 만든다(기존 영문 카테고리와도 일관).
 */
const HANDLE_BY_NAME: Record<string, string> = {
  "상의": "tops",
  "하의": "bottoms",
  "아우터": "outerwear",
  "신발": "shoes",
  "액세서리": "accessories",
}

/**
 * QA 자동화가 만든 약관 판정.
 * 스토어프론트는 "가장 최근 effective_at 의 published 약관"을 노출한다.
 * QA 가 만든 테스트 약관이 published 로 쌓이면서 **실제 이용약관 자리를 차지**했다
 * (고객 화면에 "QA-008 자동화 테스트 약관 본문입니다" 가 그대로 떠 있었다).
 */
const QA_LEGAL_VERSION = /^qa\d*-/i

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
  // 정리 대상: (a) 이름에 kr-test 태그가 남은 카테고리, (b) handle 이 비-ASCII 라 URL 이 깨지는 카테고리
  const NON_ASCII = /[^ -~]/
  const seedTestCategories = (categories ?? []).filter(
    (c: any) =>
      String(c.name ?? "").includes("kr-test") || NON_ASCII.test(String(c.handle ?? ""))
  )
  if (seedTestCategories.length) {
    logger.info(
      `[cleanup] 고객 화면에 그대로 노출되는 시드 카테고리 ${seedTestCategories.length}건 ` +
        `(kr-test 표기 또는 비-ASCII handle).`
    )
    for (const c of seedTestCategories) logger.info(`           - ${c.name} (${c.handle})`)

    if (!RENAME_SEED) {
      logger.info(
        `           → 정리하려면 CLEANUP_RENAME_TEST_CATEGORIES=true 로 실행하세요` +
          `(예: "상의(kr-test)" → 이름 "상의" / 주소 "tops").`
      )
    } else {
      const updates = seedTestCategories.map((c: any) => {
        const name = String(c.name).replace(/\s*\(kr-test\)\s*/g, "").trim()
        const stripped = String(c.handle).replace(/\s*\(kr-test\)\s*/g, "").trim()
        // 한글 handle 은 ASCII 로 치환한다(매핑에 없으면 기존 값 유지).
        const handle = HANDLE_BY_NAME[name] ?? stripped
        return { id: c.id, name, handle }
      })
      for (const u of updates) {
        logger.info(`           · 변경: ${u.name} (${u.handle})`)
      }
      if (APPLY) {
        // 워크플로우로 갱신한다 — 모듈 서비스를 직접 호출하면 `product-category.updated`
        // 이벤트가 발행되지 않아 스토어프론트 ISR 캐시(force-cache)가 **옛 이름 그대로 남는다**
        // (실제로 겪었고, /api/revalidate 를 수동 호출해야 했다).
        for (const u of updates) {
          await updateProductCategoriesWorkflow(container).run({
            input: { selector: { id: u.id }, update: { name: u.name, handle: u.handle } },
          })
        }
        logger.info(`[cleanup] 시드 카테고리 ${updates.length}건 이름·URL 정리 완료`)

        // 스토어프론트 캐시를 **직접** 무효화한다.
        // `medusa exec` 는 dev/운영 서버와 별개 프로세스라 in-process 이벤트버스의
        // storefront-revalidate 구독자가 붙지 않는다 → 워크플로우가 이벤트를 발행해도
        // 스토어프론트는 옛 이름을 계속 보여준다(실제로 겪음: force-cache + 태그 미무효화).
        const target = resolveRevalidateTarget()
        if (!target.enabled || !target.url) {
          logger.info(
            `[cleanup] STOREFRONT_URL 미설정 — 스토어프론트 캐시는 수동으로 무효화하세요` +
              `(POST /api/revalidate {"type":"category"}).`
          )
        } else {
          try {
            const headers: Record<string, string> = { "Content-Type": "application/json" }
            if (target.secret) headers["Authorization"] = `Bearer ${target.secret}`
            const res = await fetch(target.url, {
              method: "POST",
              headers,
              body: JSON.stringify({ type: "category" }),
              signal: AbortSignal.timeout(5000),
            })
            logger.info(
              res.ok
                ? `[cleanup] 스토어프론트 카테고리 캐시 무효화 완료`
                : `[cleanup] ⚠️ 캐시 무효화 실패(${res.status}) — 수동으로 POST /api/revalidate 하세요.`
            )
          } catch (e) {
            logger.info(
              `[cleanup] ⚠️ 캐시 무효화 호출 실패(${(e as Error)?.message}) — ` +
                `스토어프론트가 떠 있는지 확인 후 수동 무효화하세요.`
            )
          }
        }
      }
    }
  }

  // ── 4. QA 테스트 약관 (고객 화면의 이용약관을 가로챈다) ─────────────────
  const legalSvc = container.resolve(LEGAL_DOC_MODULE) as any
  let legalDocs: any[] = []
  try {
    legalDocs = await legalSvc.listLegalDocs({})
  } catch {
    legalDocs = []
  }
  const qaLegal = (legalDocs ?? []).filter(
    (d: any) => QA_LEGAL_VERSION.test(String(d.version ?? "")) && d.status === "published"
  )
  if (qaLegal.length) {
    logger.info(
      `[cleanup] ⚠️ QA 테스트 약관 ${qaLegal.length}건이 published 상태입니다 — ` +
        `스토어프론트는 최신 게시본을 노출하므로 실제 약관이 가려집니다.`
    )
    for (const d of qaLegal.slice(0, 5)) {
      logger.info(`           - ${d.type} ${d.version} (${String(d.body).slice(0, 30)}…)`)
    }
    if (APPLY) {
      await legalSvc.deleteLegalDocs(qaLegal.map((d: any) => d.id))
      logger.info(`[cleanup] QA 테스트 약관 ${qaLegal.length}건 정리 완료`)
      // 정리 후 각 종류별로 실제 노출될 약관을 보여준다(사장님 확인용).
      const rest = (await legalSvc.listLegalDocs({})).filter((d: any) => d.status === "published")
      const byType: Record<string, any> = {}
      for (const d of rest) {
        const cur = byType[d.type]
        if (!cur || String(d.effective_at) > String(cur.effective_at)) byType[d.type] = d
      }
      for (const [type, d] of Object.entries(byType)) {
        logger.info(`           → 현재 노출 약관: ${type} ${(d as any).version} (${String((d as any).body).length}자)`)
      }
    }
  }

  // 시드 상품 — handle 이 곧 상품 URL(/products/kr-test-p1)이라 고객에게 그대로 보인다.
  // handle 은 시드의 재실행 판정 키이기도 해서 **자동으로 바꾸지 않고 보고만** 한다.
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle"],
  })
  const seedProducts = (products ?? []).filter((p: any) =>
    String(p.handle ?? "").includes("kr-test")
  )
  if (seedProducts.length) {
    logger.info(
      `[cleanup] ⚠️ 시드 상품 ${seedProducts.length}건 — 주소가 "/products/kr-test-p1" 형태로 ` +
        `고객에게 노출됩니다. 실제 판매 상품으로 교체하거나 관리자에서 비공개 처리하세요.`
    )
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
