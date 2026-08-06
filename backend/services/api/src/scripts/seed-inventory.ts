// 테스트용 재고 시드 — 전 변형에 적정 재고 부여.
//  ① 이미 인벤토리아이템 있는 변형: 국내 물류창고 레벨 수량 설정/갱신
//  ② manage_inventory=false(미추적) 변형: 인벤토리아이템 생성+변형 연결+추적 활성화+레벨 생성
// 실행: npx medusa exec ./src/scripts/seed-inventory.ts (재실행 안전)
import { ExecArgs } from "@medusajs/framework/types"
import { createInventoryItemsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// 테스트 다양성을 위해 수량을 순환(저재고 45 포함 → 품절임박 뱃지 테스트)
const QTYS = [120, 80, 200, 45, 150, 300]

export default async function seedInventory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const sl: any = container.resolve(Modules.STOCK_LOCATION)
  const inv: any = container.resolve(Modules.INVENTORY)
  const productModule: any = container.resolve(Modules.PRODUCT)
  const link: any = container.resolve(ContainerRegistrationKeys.LINK)

  const [loc] = await sl.listStockLocations({})
  if (!loc) {
    logger.error("재고위치가 없습니다. setup-korea / localize-shop-data 먼저 실행하세요.")
    return
  }
  const locationId = loc.id
  logger.info(`재고위치: ${loc.name} [${locationId}]`)

  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "title", "manage_inventory", "inventory_items.inventory_item_id"],
    pagination: { take: 1000 } as any,
  })

  // 위치의 기존 레벨 맵 (inventory_item_id → level)
  const existingLevels = await inv.listInventoryLevels({ location_id: locationId })
  const levelByItem = new Map<string, any>()
  for (const lv of existingLevels) levelByItem.set(lv.inventory_item_id, lv)

  let updated = 0
  let created = 0
  let retrofitted = 0

  for (let i = 0; i < (variants as any[]).length; i++) {
    const v = (variants as any[])[i]
    const qty = QTYS[i % QTYS.length]
    let itemId: string | undefined = (v.inventory_items ?? [])[0]?.inventory_item_id

    // ② 인벤토리아이템 없는(미추적) 변형 → 생성 + 연결 + 추적 활성화
    if (!itemId) {
      const { result } = await createInventoryItemsWorkflow(container).run({
        input: { items: [{ sku: v.sku || `KR-INV-${i}`, title: v.title ?? undefined }] },
      })
      itemId = (Array.isArray(result) ? result[0] : result).id
      await link.create({
        [Modules.PRODUCT]: { variant_id: v.id },
        [Modules.INVENTORY]: { inventory_item_id: itemId },
      })
      if (!v.manage_inventory) {
        await productModule.updateProductVariants(v.id, { manage_inventory: true })
      }
      retrofitted++
    }

    // 레벨 설정: 있으면 수량 갱신, 없으면 생성
    //
    // ⚠️ **예약분을 얹어서** 설정한다.
    // 가용재고 = stocked - reserved 이므로, 예약이 쌓인 상태에서 stocked 만 45 로 맞추면
    // 가용이 0 이 되어 "재고를 넣었는데 담기가 안 되는" 상태가 된다.
    // (2026-08-05 실측: stocked=45 · reserved=45 · 가용=0 → E2E 2건이
    //  "Some variant does not have the required inventory" 로 실패)
    // 프로브·E2E 가 만든 주문의 예약은 그대로 남으므로, 이 스크립트는
    // **가용재고가 qty 가 되도록** 맞춰 준다.
    const existing = levelByItem.get(itemId!)
    if (existing) {
      const reserved = Number((existing as any).reserved_quantity ?? 0) || 0
      await inv.updateInventoryLevels([
        {
          inventory_item_id: itemId,
          location_id: locationId,
          stocked_quantity: qty + reserved,
        },
      ])
      updated++
    } else {
      await inv.createInventoryLevels([
        { inventory_item_id: itemId, location_id: locationId, stocked_quantity: qty },
      ])
      created++
    }
  }

  logger.info(
    `재고 시드 완료 — 미추적→추적 전환 ${retrofitted} · 레벨 신규 ${created} · 레벨 수량갱신 ${updated} (총 ${(variants as any[]).length} 변형)`
  )
  logger.info("================ 재고 시드 완료 ================")
}
