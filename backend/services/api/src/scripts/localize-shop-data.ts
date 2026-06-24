// 데이터 현지화 보강 — 판매 가능한 수준의 현실성.
//  ① KRW 가격 현실화: 데모상품 ₩10 같은 비현실 가격 → 해외가 기준 환산/정리
//  ② 창고: "European Warehouse" → 국내 물류창고(주소·연락처)
// 실행: npx medusa exec ./src/scripts/localize-shop-data.ts (재실행 안전)
import { ExecArgs } from "@medusajs/framework/types"
import { upsertVariantPricesWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

const KRW = "krw"
const FX = 1500 // 해외가(eur/usd) → KRW 근사 환산 배수(데모용, 1000원 단위 올림)
const FLOOR = 9900

function round1000(n: number) {
  return Math.ceil(n / 1000) * 1000
}

export default async function localizeShopData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // ───────── ① KRW 가격 현실화 ─────────
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product_id", "title", "prices.amount", "prices.currency_code"],
    pagination: { take: 1000 } as any,
  })

  let updated = 0
  for (const v of variants as any[]) {
    const ps = (v.prices ?? []) as any[]
    const eur = ps.find((p) => p.currency_code === "eur")?.amount
    const usd = ps.find((p) => p.currency_code === "usd")?.amount
    const krwExisting = ps.find((p) => p.currency_code === KRW)?.amount

    // 기준값 선택:
    //  - 해외가가 작으면(예: €10) 진짜 EUR 단위 → ×FX 환산
    //  - 해외가가 1000 이상이면 이미 KRW 규모 숫자(시드가 그렇게 넣음) → 그대로 사용
    //  - 해외가 없고 KRW만 있으면: 작으면 ×1000 보정, 크면 유지
    const foreign = eur ?? usd
    let krwAmount: number
    if (foreign != null) {
      krwAmount = foreign < 1000 ? round1000(foreign * FX) : round1000(foreign)
    } else if (krwExisting != null) {
      krwAmount = krwExisting < 1000 ? round1000(krwExisting * 1000) : round1000(krwExisting)
    } else {
      krwAmount = 19000
    }
    krwAmount = Math.max(FLOOR, krwAmount)

    if (krwExisting === krwAmount) continue // 변경 없음

    const prices = [
      ...ps.filter((p) => p.currency_code !== KRW).map((p) => ({ currency_code: p.currency_code, amount: p.amount })),
      { currency_code: KRW, amount: krwAmount },
    ]
    await upsertVariantPricesWorkflow(container).run({
      input: { variantPrices: [{ variant_id: v.id, product_id: v.product_id, prices }], previousVariantIds: [v.id] },
    })
    updated++
  }
  logger.info(`[localize] KRW 가격 현실화: ${updated}개 변형 갱신`)

  // ───────── ② 창고 현지화 ─────────
  const stockLocation: any = container.resolve(Modules.STOCK_LOCATION)
  const locs = await stockLocation.listStockLocations({})
  let locUpdated = 0
  for (const loc of locs) {
    if (loc.name === "국내 물류창고") continue
    await stockLocation.updateStockLocations(loc.id, {
      name: "국내 물류창고",
      address: {
        address_1: "서울특별시 강남구 테헤란로 000",
        city: "서울",
        country_code: "kr",
        postal_code: "06000",
        phone: "1600-0000",
      },
    })
    locUpdated++
    logger.info(`[localize] 창고명 변경: "${loc.name}" → "국내 물류창고"`)
  }
  logger.info(`[localize] 창고 현지화: ${locUpdated}개`)

  logger.info("================ 데이터 현지화 보강 완료 ================")
}
