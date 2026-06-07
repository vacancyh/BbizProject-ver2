// 한국 region (KRW + KR) seed script
// 실행: npx medusa exec ./src/scripts/seed-korea-region.ts
// 사장님 verbatim "한국 region 누락" (F-3) fix 입니다.
import { ExecArgs } from "@medusajs/framework/types"
import { createRegionsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function seedKoreaRegion({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const regionModule = container.resolve(Modules.REGION)

  // 이미 한국 region 존재 시 skip
  const existing = await regionModule.listRegions({ name: "한국" })
  if (existing.length > 0) {
    logger.info("한국 region 이 이미 존재합니다. skip.")
    return
  }

  logger.info("한국 region 생성 중...")
  const { result } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "한국",
          currency_code: "krw",
          countries: ["kr"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })
  logger.info(`한국 region 생성 완료 = id=${result[0].id}, currency=krw, country=kr`)
}
