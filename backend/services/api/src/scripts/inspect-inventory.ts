import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function inspectInventory({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const inv: any = container.resolve(Modules.INVENTORY)

  const levels = await inv.listInventoryLevels({})
  const total = levels.reduce((a: number, l: any) => a + (l.stocked_quantity ?? 0), 0)
  logger.info(`레벨 ${levels.length}개 · 총 재고 ${total}`)

  // 판매채널 ↔ 재고위치
  const { data: scs } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "stock_locations.name"],
  })
  for (const sc of scs as any[]) {
    logger.info(`SC "${sc.name}"[${sc.id}] → 위치: ${(sc.stock_locations ?? []).map((s: any) => s.name).join(", ") || "(없음)"}`)
  }

  // 퍼블리셔블 키 ↔ 판매채널
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["id", "title", "type", "token", "sales_channels.id", "sales_channels.name"],
  })
  for (const k of (keys as any[]).filter((k) => k.type === "publishable")) {
    logger.info(`PK "${k.title}" (${String(k.token).slice(0, 12)}…) → SC: ${(k.sales_channels ?? []).map((s: any) => s.name).join(", ") || "(없음)"}`)
  }
}
