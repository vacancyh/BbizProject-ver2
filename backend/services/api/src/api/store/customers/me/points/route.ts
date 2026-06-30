/**
 * 내 적립금 Store API (로그인 고객 전용)
 *  - GET /store/customers/me/points → 보유 적립금 잔액 + 적립/사용 내역
 * 인증: 스토어 고객 세션/Bearer(req.auth_context.actor_id = customer.id).
 * 가드레일: Medusa core 미수정. customer-point 모듈 전용 테이블(point_ledger)만 조회.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const EMPTY = {
  entries: [],
  summary: { balance: 0, total_earned: 0, total_used: 0 },
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.json(EMPTY)
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "point_ledger",
    fields: ["id", "entry_type", "amount", "reason", "expires_at", "created_at"],
    filters: { customer_id: customerId } as Record<string, unknown>,
  })

  const entries = (data ?? [])
    .map((e: any) => ({
      id: e.id,
      entry_type: e.entry_type,
      amount: Number(e.amount),
      reason: e.reason ?? undefined,
      expires_at: e.expires_at
        ? e.expires_at instanceof Date
          ? e.expires_at.toISOString()
          : String(e.expires_at)
        : undefined,
      created_at:
        e.created_at instanceof Date
          ? e.created_at.toISOString()
          : String(e.created_at),
    }))
    .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))

  let balance = 0
  let total_earned = 0
  let total_used = 0
  for (const e of entries) {
    balance += e.amount
    if (e.amount > 0) total_earned += e.amount
    else total_used += Math.abs(e.amount)
  }

  res.json({ entries, summary: { balance, total_earned, total_used } })
}
