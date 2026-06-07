/**
 * 고객 멤버십 조회 Admin API
 *
 *  - GET /admin/membership/customers/:id
 *      고객의 누적금액·현재 등급·다음 등급까지 잔여 금액을 반환.
 *      미가입(레코드 없음) 고객도 최저 등급/0 으로 표시(DB 미생성).
 *
 * 등급 정책(tiers)은 policy 모듈 `membership.tiers` 에서 조회하여 룰에 주입.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POLICY_MODULE } from "../../../../../modules/policy"
import PolicyModuleService from "../../../../../modules/policy/service"
import { MEMBERSHIP_MODULE } from "../../../../../modules/membership"
import MembershipModuleService from "../../../../../modules/membership/service"
import {
  DEFAULT_TIERS,
  parseTiersPolicy,
  nextTierGap,
} from "../../../../../modules/membership/logic"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const policy = req.scope.resolve(POLICY_MODULE) as unknown as PolicyModuleService
  const membership = req.scope.resolve(MEMBERSHIP_MODULE) as unknown as MembershipModuleService

  const customerId = req.params.id
  const row = await policy.get("membership.tiers")
  const tiers = row ? parseTiersPolicy(row.value) : DEFAULT_TIERS

  const snapshot = await membership.getOrDefault(customerId, tiers)
  const gap = nextTierGap(snapshot.accrued_amount, tiers)

  res.json({
    membership: snapshot,
    next_tier: gap ? { name: gap.nextTier.name, remaining: gap.remaining } : null,
    tiers,
  })
}
