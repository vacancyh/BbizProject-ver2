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
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  cancelOrderWorkflow,
  cancelOrderFulfillmentWorkflow,
} from "@medusajs/medusa/core-flows"
import { ORDER_OPS_KR_MODULE } from "../../../../../modules/order-ops-kr"
import OrderOpsKrModuleService from "../../../../../modules/order-ops-kr/service"
import { validateCancelReason, buildCancelIdempotencyKey } from "./cancel-logic"
import { reverseOrderRewards } from "../../../../_utils/reward-reversal"

/**
 * 강제취소 임계구역을 **주문 단위**로 직렬화한다 (2026-08-03 재점검).
 *
 * 이전에는 "멱등키 조회 → 취소·환불 집행 → 멱등키 저장" 이 락 없이 실행됐다.
 * 같은 결함을 환불 라우트에서 실측했다(동일 nonce 동시 3건 → 실제 환불 3건 집행).
 * 취소는 cancelOrderWorkflow 가 자동 환불까지 수행하므로 동일하게 금전 영향이 있다.
 *
 * 락 키를 **주문 id** 로 잡는 이유: 이 라우트는 nonce 가 선택값이라,
 * 멱등키로 잡으면 nonce 없는 동시 요청이 그대로 통과한다.
 */
const CANCEL_LOCK_ARGS = { timeout: 30 } // 초

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const locking = req.scope.resolve(Modules.LOCKING) as any
  try {
    await locking.execute(`cancel:${orderId}`, async () => { await handleCancel(req, res) }, CANCEL_LOCK_ARGS)
  } catch (e) {
    console.warn(`[cancel] 락/처리 오류(order=${orderId}): ${(e as Error)?.message}`)
    if (!res.headersSent) {
      res.status(409).json({
        message: "동일 주문의 취소가 처리 중입니다. 잠시 후 결과를 확인해 주세요.",
        code: "CANCEL_IN_PROGRESS",
      })
    }
  }
}

/** 실제 강제취소 처리 — 반드시 POST 의 주문 단위 락 안에서만 호출한다. */
async function handleCancel(req: MedusaRequest, res: MedusaResponse) {
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
      // 2026-08-03: 만료 여부와 무관하게 재집행하지 않는다(fail-closed).
      // 이전에는 expires_at 이 지난 키를 "새 요청"으로 통과시켜, 취소·환불이 한 번 더
      // 실제 집행될 수 있었다. 환불 라우트는 2026-07-28 에 같은 이유로 고쳤는데
      // 이 라우트에는 반영되지 않았다(동일 결함 잔존).
      const now = new Date()
      const expiresAt = new Date(existingIdem.expires_at)
      const expired = now >= expiresAt
      {
        res.status(409).json({
          message: expired
            ? "이미 처리된 강제취소 요청입니다(멱등키 재사용). 새 요청은 새 nonce 로 보내세요."
            : "중복 강제취소 요청입니다. 캐시 응답을 반환합니다.",
          cached: true,
          expired,
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
