// 빈 화면 보강 시드 — 상품유형/태그/쿠폰(프로모션)/마케팅(캠페인).
// 실행: npx medusa exec ./src/scripts/seed-screen-data.ts (재실행 안전)
import { ExecArgs } from "@medusajs/framework/types"
import {
  createProductTypesWorkflow,
  createProductTagsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function seedScreenData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // ① 상품유형
  const { data: types } = await query.graph({ entity: "product_type", fields: ["id", "value"] })
  if ((types as any[]).length === 0) {
    await createProductTypesWorkflow(container).run({
      input: { product_types: ["의류", "신발", "가방", "액세서리", "패션소품"].map((value) => ({ value })) },
    })
    logger.info("[screen] 상품유형 5종 생성")
  } else logger.info(`[screen] 상품유형 이미 ${(types as any[]).length}종`)

  // ② 상품태그
  const { data: tags } = await query.graph({ entity: "product_tag", fields: ["id", "value"] })
  if ((tags as any[]).length === 0) {
    await createProductTagsWorkflow(container).run({
      input: { product_tags: ["신상", "베스트", "세일", "한정", "친환경"].map((value) => ({ value })) },
    })
    logger.info("[screen] 상품태그 5종 생성")
  } else logger.info(`[screen] 상품태그 이미 ${(tags as any[]).length}종`)

  const promoModule: any = container.resolve(Modules.PROMOTION)

  // ③ 쿠폰(프로모션) — 모듈 서비스 직접 호출
  const { data: promos } = await query.graph({ entity: "promotion", fields: ["id", "code"] })
  if ((promos as any[]).length === 0) {
    await promoModule.createPromotions([
      {
        code: "WELCOME10",
        type: "standard",
        status: "active",
        application_method: { type: "percentage", target_type: "order", allocation: "across", value: 10 },
      },
      {
        code: "KRW5000",
        type: "standard",
        status: "active",
        application_method: { type: "fixed", target_type: "order", allocation: "across", value: 5000, currency_code: "krw" },
      },
    ])
    logger.info("[screen] 쿠폰 2종 생성(WELCOME10·KRW5000)")
  } else logger.info(`[screen] 쿠폰 이미 ${(promos as any[]).length}개`)

  // ④ 마케팅 캠페인 — 모듈 서비스 직접 호출
  const { data: camps } = await query.graph({ entity: "campaign", fields: ["id", "name"] })
  if ((camps as any[]).length === 0) {
    await promoModule.createCampaigns([
      {
        name: "신규가입 환영 캠페인",
        campaign_identifier: "welcome-2026",
        description: "신규 회원 대상 웰컴 프로모션",
        budget: { type: "usage", limit: 1000 },
      },
      {
        name: "여름 시즌오프",
        campaign_identifier: "summer-sale-2026",
        description: "여름 시즌 할인 캠페인",
        budget: { type: "spend", limit: 5000000, currency_code: "krw" },
      },
    ])
    logger.info("[screen] 마케팅 캠페인 2종 생성")
  } else logger.info(`[screen] 캠페인 이미 ${(camps as any[]).length}개`)

  logger.info("================ 빈 화면 보강 시드 완료 ================")
}
