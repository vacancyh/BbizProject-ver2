/**
 * 환불/취소 시 적립금·멤버십 역적립 유틸(보안점검 2026-07-27 A1).
 *
 * 배경: order.placed 시 order-placed-rewards 구독자가 구매 포인트 적립 + 멤버십 누적을 수행하는데,
 *       환불/취소 경로에 역적립이 없어 "주문→적립→환불→적립·등급 유지" 악용이 가능했다.
 *
 * 정책(사용자 확정): 전액/취소=전량, 부분환불=비례 역적립. 이미 사용한 적립금은 잔액 0 바닥(음수 미허용).
 * 멱등: reasonKey(예: "cancel-reversal", "refund-reversal:<nonce>") 기준 1회만 처리
 *       (customer-point.reverseAccrualForOrder 의 accrual-log 멱등 + 그에 게이트된 멤버십 차감).
 * 실패해도 취소/환불 흐름을 막지 않도록 호출측에서 try/catch 로 감싼다(본 유틸도 내부 흡수).
 */
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { POLICY_MODULE } from "../../modules/policy"
import type PolicyModuleService from "../../modules/policy/service"
import { MEMBERSHIP_MODULE } from "../../modules/membership"
import type MembershipModuleService from "../../modules/membership/service"
import { DEFAULT_TIERS, parseTiersPolicy } from "../../modules/membership/logic"
import { CUSTOMER_POINT_MODULE } from "../../modules/customer-point"
import type CustomerPointModuleService from "../../modules/customer-point/service"

function toAmount(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export type ReverseRewardsInput = {
  orderId: string
  /** 환불 금액. null = 전액(취소/전액환불). */
  refundAmount?: number | null
  /** 멱등 키(사유). 예: "cancel-reversal", `refund-reversal:${nonce}` */
  reasonKey: string
}

export async function reverseOrderRewards(
  scope: any,
  input: ReverseRewardsInput
): Promise<{ skipped: boolean; reversedPoints?: number; refundAmount?: number; error?: boolean }> {
  const logger = (() => {
    try { return scope.resolve(ContainerRegistrationKeys.LOGGER) } catch { return console }
  })()
  try {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id", "total", "item_total"],
      filters: { id: input.orderId },
    })
    const order = data?.[0]
    const customerId = order?.customer_id
    if (!customerId) return { skipped: true } // 비회원 주문 — 적립 없음

    const orderAmount = toAmount(order.item_total) || toAmount(order.total)
    if (orderAmount <= 0) return { skipped: true }

    const refundAmount =
      input.refundAmount == null ? orderAmount : Math.min(toAmount(input.refundAmount), orderAmount)
    if (refundAmount <= 0) return { skipped: true }

    const point = scope.resolve(CUSTOMER_POINT_MODULE) as CustomerPointModuleService
    const membership = scope.resolve(MEMBERSHIP_MODULE) as MembershipModuleService
    const policy = scope.resolve(POLICY_MODULE) as PolicyModuleService

    // 회수 포인트 = 구매 적립분 × (환불액 / 주문액), 내림.
    const earned = await point.getAccrualPointsEarned(input.orderId, "purchase")
    const reversePoints = Math.floor(earned * (refundAmount / orderAmount))

    const r = await point.reverseAccrualForOrder(customerId, input.orderId, input.reasonKey, reversePoints)
    if (r.skipped) return { skipped: true } // 이미 역적립됨(멱등)

    // 멤버십 누적 차감(등급 재산정) — 포인트 역적립이 실제 수행된 경우에만 1회.
    try {
      const tiersRow = await policy.get("membership.tiers")
      const tiers = tiersRow ? parseTiersPolicy(tiersRow.value) : DEFAULT_TIERS
      await membership.applyRefund(customerId, refundAmount, tiers)
    } catch (e) {
      logger.warn?.(`[reward-reversal] 멤버십 차감 스킵(order=${input.orderId}): ${(e as Error)?.message}`)
    }

    logger.info?.(
      `[reward-reversal] 역적립(order=${input.orderId}, key=${input.reasonKey}) 포인트 -${r.reversed}, 환불액 ${refundAmount}`
    )
    return { skipped: false, reversedPoints: r.reversed, refundAmount }
  } catch (e) {
    logger.warn?.(`[reward-reversal] 실패(order=${input.orderId}): ${(e as Error)?.message}`)
    return { skipped: true, error: true }
  }
}
