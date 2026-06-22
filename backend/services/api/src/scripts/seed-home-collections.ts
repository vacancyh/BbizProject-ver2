// 홈 진열용 컬렉션 시드 — 스토어프론트 홈이 컬렉션 의존이라 비어보이는 문제 해소.
// 실행: npx medusa exec ./src/scripts/seed-home-collections.ts (재실행 안전)
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function seedHomeCollections({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pm: any = container.resolve(Modules.PRODUCT)

  async function ensureCollection(title: string, handle: string) {
    const existing = await pm.listProductCollections({ handle })
    if (existing.length) return existing[0]
    const created = await pm.createProductCollections([{ title, handle }])
    return Array.isArray(created) ? created[0] : created
  }

  const best = await ensureCollection("베스트 상품", "best")
  const fresh = await ensureCollection("신상품", "new")
  logger.info(`컬렉션: best=${best.id}, new=${fresh.id}`)

  const { data: prods } = await query.graph({
    entity: "product",
    fields: ["id", "collection_id"],
    pagination: { take: 12 } as any,
  })

  let assigned = 0
  for (let i = 0; i < prods.length; i++) {
    const target = i < 6 ? best.id : fresh.id
    if (prods[i].collection_id === target) continue
    await pm.updateProducts(prods[i].id, { collection_id: target })
    assigned++
  }
  logger.info(`상품 컬렉션 배정: ${assigned}건 (best 6 / new 6)`)
  logger.info("================ 홈 컬렉션 시드 완료 ================")
}
