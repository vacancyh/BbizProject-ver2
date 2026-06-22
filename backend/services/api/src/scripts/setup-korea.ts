// 국내(한국/KRW) 설정 — 해외 기반(EUR) 유지 + 한국 판매 가능하게 additive 추가.
// 실행: npx medusa exec ./src/scripts/setup-korea.ts
//  ① store KRW 통화(기본) ② 한국 region(KRW/kr) ③ KR 세금리전 10%
//  ④ 전 변형 KRW 가격(기존 eur/usd 보존) ⑤ 한국 service zone + 국내 배송옵션(3000 KRW)
import { ExecArgs } from "@medusajs/framework/types"
import {
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  upsertVariantPricesWorkflow,
  createShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const KRW = "krw"

export default async function setupKorea({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeModule = container.resolve(Modules.STORE)
  const regionModule = container.resolve(Modules.REGION)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  // ① store: krw 통화 추가(+기본)
  const [store] = await storeModule.listStores()
  const cur = (store.supported_currencies ?? []) as any[]
  if (!cur.some((c) => c.currency_code === KRW)) {
    await storeModule.updateStores(store.id, {
      supported_currencies: [
        { currency_code: KRW, is_default: true },
        ...cur.map((c) => ({ currency_code: c.currency_code, is_default: false })),
      ],
    })
    logger.info("[korea] store krw 통화 추가(기본)")
  } else {
    logger.info("[korea] store krw 이미 있음")
  }

  // ② 한국 region
  let [kr] = await regionModule.listRegions({ name: "한국" })
  if (!kr) {
    const { result } = await createRegionsWorkflow(container).run({
      input: { regions: [{ name: "한국", currency_code: KRW, countries: ["kr"], payment_providers: ["pp_system_default"] }] },
    })
    kr = result[0]
    logger.info(`[korea] 한국 region 생성: ${kr.id}`)
  } else {
    logger.info(`[korea] 한국 region 존재: ${kr.id}`)
  }

  // ③ KR 세금리전(10%)
  const { data: trs } = await query.graph({ entity: "tax_region", fields: ["id", "country_code"] })
  if (!(trs as any[]).some((t) => t.country_code === "kr")) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: "kr", provider_id: "tp_system", default_tax_rate: { name: "부가가치세", code: "vat", rate: 10 } }] as any,
    })
    logger.info("[korea] KR 세금리전(10%) 생성")
  } else {
    logger.info("[korea] KR 세금리전 존재")
  }

  // ④ 전 변형 KRW 가격(기존 통화 보존)
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id", "prices.amount", "prices.currency_code"],
    pagination: { take: 1000 } as any,
  })
  let priced = 0
  for (const v of variants as any[]) {
    const ps = (v.prices ?? []) as any[]
    if (ps.some((p) => p.currency_code === KRW)) continue
    const base = ps.find((p) => p.currency_code === "eur")?.amount ?? ps.find((p) => p.currency_code === "usd")?.amount ?? 10000
    const prices = [
      ...ps.map((p) => ({ currency_code: p.currency_code, amount: p.amount })),
      { currency_code: KRW, amount: base },
    ]
    await upsertVariantPricesWorkflow(container).run({
      input: { variantPrices: [{ variant_id: v.id, product_id: v.product_id, prices }], previousVariantIds: [v.id] },
    })
    priced++
  }
  logger.info(`[korea] 변형 KRW 가격 추가: ${priced}`)

  // ⑤ 한국 service zone + 국내 배송옵션
  const { data: fsets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "service_zones.id", "service_zones.name", "service_zones.geo_zones.country_code"],
  })
  const fset = (fsets as any[])[0]
  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] })
  const profileId = (profiles as any[])[0]?.id
  if (fset && profileId) {
    let krZone = (fset.service_zones ?? []).find((z: any) => z.name === "한국")
    if (!krZone) {
      const created = await fulfillmentModule.createServiceZones({
        fulfillment_set_id: fset.id,
        name: "한국",
        geo_zones: [{ country_code: "kr", type: "country" }],
      } as any)
      krZone = Array.isArray(created) ? created[0] : created
      logger.info(`[korea] 한국 service zone 생성: ${krZone.id}`)
    }
    const { data: existOpts } = await query.graph({ entity: "shipping_option", fields: ["id", "name"] })
    if (!(existOpts as any[]).some((o) => o.name === "기본 배송(국내)")) {
      await createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: "기본 배송(국내)",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: krZone.id,
            shipping_profile_id: profileId,
            type: { label: "국내", description: "국내 택배 2-3일", code: "standard-kr" },
            prices: [
              { currency_code: KRW, amount: 3000 },
              { region_id: kr.id, amount: 3000 },
            ],
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
        ],
      })
      logger.info("[korea] 국내 배송옵션 생성(3000 KRW)")
    }
  }

  logger.info("================ 국내(한국/KRW) 설정 완료 ================")
}
