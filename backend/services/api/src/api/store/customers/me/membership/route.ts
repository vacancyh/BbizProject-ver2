/**
 * 내 회원 등급 Store API (로그인 고객 전용)
 *  - GET /store/customers/me/membership → 누적 구매액 + 현재 등급
 * 인증: 스토어 고객 세션/Bearer(req.auth_context.actor_id = customer.id).
 * 등급 구간/혜택표(tiers)는 스토어프론트에서 합산해 표시(membership.tiers 정책과 동일 기준).
 * 가드레일: Medusa core 미수정. membership 모듈 전용 테이블(customer_membership)만 조회.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.json({ membership: null })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "customer_membership",
    fields: ["customer_id", "accrued_amount", "current_tier", "last_change_reason"],
    filters: { customer_id: customerId } as Record<string, unknown>,
  })

  const row = (data ?? [])[0]
  const membership = row
    ? {
        customer_id: row.customer_id,
        accrued_amount: Number(row.accrued_amount ?? 0),
        current_tier: row.current_tier ?? "일반",
        last_change_reason: row.last_change_reason ?? "accrual",
      }
    : {
        customer_id: customerId,
        accrued_amount: 0,
        current_tier: "일반",
        last_change_reason: "accrual",
      }

  res.json({ membership })
}
