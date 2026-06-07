/**
 * 고객 멤버십 누적/환불 반영 Admin API
 *
 *  - POST /admin/membership/customers/:id/accrual
 *      body = { amount: number, type?: "accrual" | "refund" }
 *      type=accrual(기본): 누적금액 증가 후 등급 재산정(upsert).
 *      type=refund: 누적금액 차감 후 재산정(하향 가능, 멤버십 없으면 404).
 *
 * 등급 정책(tiers)은 policy 모듈 `membership.tiers` 에서 조회하여 룰에 주입.
 * 주: 주문완료/환불 이벤트 자동 누적(구독자/cron)은 갭B 후속(deferred). 본 route 는 수동/명시 반영.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POLICY_MODULE } from "../../../../../../modules/policy"
import PolicyModuleService from "../../../../../../modules/policy/service"
import { MEMBERSHIP_MODULE } from "../../../../../../modules/membership"
import MembershipModuleService from "../../../../../../modules/membership/service"
import { DEFAULT_TIERS, parseTiersPolicy } from "../../../../../../modules/membership/logic"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const policy = req.scope.resolve(POLICY_MODULE) as unknown as PolicyModuleService
  const membership = req.scope.resolve(MEMBERSHIP_MODULE) as unknown as MembershipModuleService

  const customerId = req.params.id
  const body = (req.body ?? {}) as { amount?: unknown; type?: string }

  if (typeof body.amount !== "number" || !Number.isFinite(body.amount)) {
    res.status(400).json({ message: "amount(숫자)가 필요합니다." })
    return
  }
  const type = body.type === "refund" ? "refund" : "accrual"

  const row = await policy.get("membership.tiers")
  const tiers = row ? parseTiersPolicy(row.value) : DEFAULT_TIERS

  try {
    const snapshot =
      type === "refund"
        ? await membership.applyRefund(customerId, body.amount, tiers)
        : await membership.recordAccrual(customerId, body.amount, tiers)
    res.status(200).json({ membership: snapshot, applied: type })
  } catch (e: any) {
    if (String(e?.message ?? "").includes("멤버십이 없습니다")) {
      res.status(404).json({ message: `멤버십이 없습니다: ${customerId}` })
      return
    }
    throw e
  }
}
