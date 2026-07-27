/**
 * 주문 강제취소 Admin API (한국형 GAP_B + Medusa 워크플로우 래핑)
 *
 *  POST /admin/orders-kr/:id/cancel
 *    { reason: "fraud"|"staff"|"inventory"|"other", confirm: true, nonce?: string }
 *
 *    ① reason enum 검증 (validateCancelReason — cancel-logic.ts)
 *    ② 멱등키 중복 확인 → 409 + 캐시 반환
 *    ③ 미취소 fulfillment 사전취소 (cancelOrderFulfillmentWorkflow 선행 호출)
 *    ④ 강제취소 사유 메모 적재(kind=cancel)
 *    ⑤ Medusa cancelOrderWorkflow 호출(재고복구+환불+알림 원자성)
 *    ⑥ order_cancellation append-only 적재 (recordCancellation)
 *    ⑦ 멱등키 캐시 저장 (saveIdempotency)
 *
 * 이중확인(confirm=true) 필수. 권한검사는 미들웨어(orders 메뉴 create/update).
 *
 * ★ blocker 핵심: cancelOrderWorkflow → cancelValidateOrder 가 미취소 fulfillment 존재 시
 *   422 throw. 따라서 ③에서 cancelOrderFulfillmentWorkflow 선행 호출 필수.
 *
 * spec: dag/d2_주문관리/t010_강제취소.md §4·§5·§6·§8
 * unit: unit_012_강제취소.md UT-001·UT-002·UT-003
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  cancelOrderWorkflow,
  cancelOrderFulfillmentWorkflow,
} from "@medusajs/medusa/core-flows"
import { ORDER_OPS_KR_MODULE } from "../../../../../modules/order-ops-kr"
import OrderOpsKrModuleService from "../../../../../modules/order-ops-kr/service"
import { validateCancelReason, buildCancelIdempotencyKey } from "./cancel-logic"
import { reverseOrderRewards } from "../../../../_utils/reward-reversal"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as {
    reason?: string
    confirm?: boolean
    nonce?: string
    idempotency_key?: string
  }

  // ── ① reason enum 검증 (spec I1 / UT-003) ────────────────────────────────
  const reasonValidation = validateCancelReason(body.reason)
  if (!reasonValidation.valid) {
    res.status(400).json({ message: reasonValidation.message })
    return
  }
  const reason = reasonValidation.reason

  // ── 이중확인 (spec I2) ────────────────────────────────────────────────────
  if (body.confirm !== true) {
    res.status(409).json({ message: "주문 강제취소에는 이중확인(confirm=true)이 필요합니다." })
    return
  }

  const orderId = req.params.id
  const actorId = (req as any).auth_context?.actor_id ?? null

  // ── 멱등 nonce 처리 ────────────────────────────────────────────────────────
  const rawNonce = body.nonce ?? body.idempotency_key ?? null

  const svc = req.scope.resolve(ORDER_OPS_KR_MODULE) as unknown as OrderOpsKrModuleService

  // ── ② 멱등키 중복 확인 ────────────────────────────────────────────────────
  let idempotencyKey: string | null = null
  if (rawNonce) {
    idempotencyKey = buildCancelIdempotencyKey(orderId, rawNonce)
    const existingIdem = await svc.findIdempotency(idempotencyKey)
    if (existingIdem) {
      const now = new Date()
      const expiresAt = new Date(existingIdem.expires_at)
      if (now < expiresAt) {
        res.status(409).json({
          message: "중복 강제취소 요청입니다. 캐시 응답을 반환합니다.",
          cached: true,
          ...existingIdem.cached_response,
        })
        return
      }
    }
  }

  // ── actorEmail 조회 ────────────────────────────────────────────────────────
  let actorEmail: string | null = null
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "user",
      fields: ["email"],
      filters: { id: actorId },
    })
    actorEmail = data?.[0]?.email ?? null
  } catch {
    actorEmail = null
  }

  // ── ③ 미취소 fulfillment 사전취소 ─────────────────────────────────────────
  // cancelOrderWorkflow → cancelValidateOrder 가 미취소 fulfillment 존재 시 422 throw.
  // 따라서 cancelOrderFulfillmentWorkflow 를 먼저 호출해 전체 취소 후 진행.
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orderData } = await query.graph({
      entity: "order",
      fields: ["id", "fulfillments.id", "fulfillments.canceled_at"],
      filters: { id: orderId },
    })
    const order = orderData?.[0] as any
    const fulfillments: Array<{ id: string; canceled_at: string | null }> =
      order?.fulfillments ?? []
    const activeFulfillments = fulfillments.filter((f) => f.canceled_at == null)

    for (const ful of activeFulfillments) {
      await cancelOrderFulfillmentWorkflow(req.scope).run({
        input: {
          order_id: orderId,
          fulfillment_id: ful.id,
          canceled_by: actorId ?? undefined,
          no_notification: true,
        },
      })
    }
  } catch (e) {
    res.status(422).json({
      message: `주문 fulfillment 취소 처리에 실패했습니다: ${(e as Error).message}`,
    })
    return
  }

  // ── ④ 강제취소 사유 메모 적재(취소 실패 시에도 시도 이력 남김) ─────────────
  await svc.addMemo(
    orderId,
    `주문 강제취소: ${reason}`,
    { id: actorId, email: actorEmail },
    "cancel"
  )

  // ── ⑤ Medusa cancelOrderWorkflow 호출(재고복구+환불+알림 원자성) ─────────
  try {
    await cancelOrderWorkflow(req.scope).run({
      input: { order_id: orderId, canceled_by: actorId ?? undefined },
    })
  } catch (e) {
    res.status(422).json({
      message: `주문 취소 처리에 실패했습니다: ${(e as Error).message}`,
      memo_recorded: true,
    })
    return
  }

  // ── ⑤-1 적립금·멤버십 역적립(A1) — 전량 회수. 실패해도 취소 흐름 불방해 ──
  await reverseOrderRewards(req.scope, {
    orderId,
    refundAmount: null, // 취소 = 전액 역적립
    reasonKey: "cancel-reversal",
  }).catch(() => {})

  // ── ⑥ order_cancellation append-only 적재 ───────────────────────────────
  await svc.recordCancellation({
    order_id: orderId,
    refund_amount: 0, // cancelOrderWorkflow 가 자동 환불 처리 — 별도 금액 산출 불필요
    refund_method: "pg",
    reason,
  })

  // ── ⑦ 멱등키 캐시 저장 (nonce 제공 시만) ────────────────────────────────
  const responsePayload: Record<string, unknown> = {
    canceled: true,
    order_id: orderId,
    reason,
  }
  if (idempotencyKey) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await svc.saveIdempotency(idempotencyKey, responsePayload, expiresAt)
  }

  res.json(responsePayload)
}
