// 도메인별 데이터 수 점검 — '빈 화면' 원인(실제 0건 vs 카드형 오탐) 구분용.
// 실행: npx medusa exec ./src/scripts/audit-data.ts
import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const ENTITIES = [
  "product",
  "product_variant",
  "product_category",
  "product_type",
  "product_tag",
  "product_collection",
  "promotion",
  "campaign",
  "sales_channel",
  "return_reason",
  "customer",
  "customer_group",
  "order",
  "region",
  "tax_region",
  "stock_location",
  "shipping_option",
  // 커스텀 모듈 후보(이름 추정 — 실패 시 skip)
  "review",
  "product_review",
  "inquiry",
  "legal_document",
  "legal_doc",
  "banned_word",
  "time_sale",
  "settlement",
  "customer_point",
  "point_account",
  "membership",
  "consent",
  "audit_log",
]

export default async function auditData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const ok: string[] = []
  for (const entity of ENTITIES) {
    try {
      const { data } = await query.graph({ entity, fields: ["id"], pagination: { take: 1000 } as any })
      const n = (data as any[]).length
      ok.push(`${n === 0 ? "📭" : "  "} ${entity} = ${n}`)
    } catch {
      // 등록되지 않은 엔티티명 → skip
    }
  }
  logger.info("===== 도메인별 데이터 수 =====\n" + ok.join("\n"))
}
