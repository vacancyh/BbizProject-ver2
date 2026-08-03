/**
 * 주문 환불 Admin API (한국형 커스텀 — Medusa core 미제공)
 *
 *  POST /admin/orders/:id/refund
 *    ⓪ 멱등키 단위 분산 락 획득 — 동시 요청 직렬화(2026-08-03 추가, 이중 환불 실측 대응)
 *    ① 멱등키 중복 확인 → 409 + 캐시 반환 (spec C1/UT-003)
 *    ② 환불액 계산 (calcProratedRefund 부분환불 / 전액)
 *    ③ 음수·초과 검증 (≤ 결제액 − 기환불)
 *    ④ Medusa refundPaymentWorkflow 호출 → PG 환불 (spec A1)
 *       실패 시 전체 롤백 + 보류 응답 (spec C2)
 *    ⑤ recordCancellation — order_cancellation append-only 적재
 *    ⑥ saveIdempotency — 멱등키 캐시 저장
 *    ⑦ calcReshippingFee — 재청구 배송비 응답 포함 (spec F7)
 *
 * ★ 정산(settlement_daily) 차감은 본 route 에서 수행하지 않음 — d7 이벤트/payload 책임.
 *
 * spec: dag/d2_주문관리/t007_환불.md §4·§5·§6·§8
 * import depth: 5단계 (refund → [id] → orders → admin → api → src → modules)
 *   — history/route.ts 와 동일 패턴.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refundPaymentWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ORDER_OPS_KR_MODULE } from "../../../../../modules/order-ops-kr"
import OrderOpsKrModuleService from "../../../../../modules/order-ops-kr/service"
import {
  calcProratedRefund,
  calcReshippingFee,
} from "./refund-logic"
import { buildIdempotencyKey } from "./idempotency-logic"
import { reverseOrderRewards } from "../../../../_utils/reward-reversal"

/** POST /admin/orders/:id/refund 요청 바디 */
interface RefundRequestBody {
  /** 부분환불 대상 라인 배열. 미전달 시 전액환불 (amount 사용). */
  items?: { id: string; amount: number }[]
  /** 전액 환불 금액 (items 미전달 시 사용). */
  amount?: number
  /**
   * 멱등 nonce (클라이언트 제공 UUID 등).
   * 지정 시 buildIdempotencyKey 로 "{orderId}:refund:{nonce}" 형식의 정규 키를 생성합니다.
   * idempotency_key 와 동시 전달 시 nonce 가 우선합니다. (spec I2)
   */
  nonce?: string
  /**
   * 레거시 멱등키 필드 (nonce 미전달 시 nonce 대체값으로 사용).
   * nonce 또는 idempotency_key 중 하나는 필수입니다.
   */
  idempotency_key?: string
  /** 환불 수단: pg | account */
  refund_method: "pg" | "account"
  /** 계좌 입금 시 은행·계좌·예금주 */
  account_info?: Record<string, unknown> | null
  /** 쿠폰 할인액(비례배분 계산용, 기본 0) */
  coupon_discount?: number
  /** 포인트 사용액(비례배분 계산용, 기본 0) */
  point_discount?: number
  /** 배송비(비례배분 계산용, 기본 0) */
  shipping_fee?: number
  /** 전체 주문 라인 합계(비례배분 기준, 기본 0) */
  total_line_amount?: number
  /** 환불 사유 (기본 "refund") */
  reason?: string
}

/**
 * 환불 임계구역을 멱등키 단위로 직렬화한다 (2026-08-03 재점검에서 발견).
 *
 * 이전에는 "멱등키 조회 → 없으면 환불 집행 → 멱등키 저장" 이 락 없이 실행됐다.
 * **순차** 재요청은 409 로 막혔지만 **동시** 요청은 모두 조회를 통과해 각자 환불을 집행했다.
 * 실측(2026-08-03): 동일 nonce 로 동시 3건 → refund 레코드 3행(1,000원 × 3) 생성.
 * 즉 요청한 1,000원 대신 3,000원이 실제로 빠져나갔다.
 *
 * 락 키를 멱등키로 잡으면 같은 nonce 의 동시 요청이 한 줄로 서고,
 * 두 번째부터는 락 안에서 ① 검사에 걸려 409(cached)로 반환된다.
 * timeout 이 넉넉한 이유: 내부에서 PG 환불 워크플로우까지 수행하기 때문.
 */
const REFUND_LOCK_ARGS = { timeout: 30 } // 초

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const rawBody = (req.body ?? {}) as RefundRequestBody
  const lockNonce = rawBody.nonce ?? rawBody.idempotency_key
  if (!lockNonce) {
    res.status(400).json({ message: "nonce 또는 idempotency_key 는 필수입니다." })
    return
  }
  const lockKey = `refund:${buildIdempotencyKey(orderId, lockNonce)}`
  const locking = req.scope.resolve(Modules.LOCKING) as any
  try {
    await locking.execute(lockKey, async () => { await handleRefund(req, res) }, REFUND_LOCK_ARGS)
  } catch (e) {
    // 락 획득 실패 = 같은 멱등키가 처리 중. 절대 그냥 통과시키지 않는다(이중 환불 방지).
    console.warn(`[refund] 락/처리 오류(order=${orderId}): ${(e as Error)?.message}`)
    if (!res.headersSent) {
      res.status(409).json({
        message: "동일한 환불 요청이 처리 중입니다. 잠시 후 결과를 확인해 주세요.",
        code: "REFUND_IN_PROGRESS",
      })
    }
  }
}

/** 실제 환불 처리 — 반드시 POST 의 멱등키 락 안에서만 호출한다. */
async function handleRefund(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  const body = (req.body ?? {}) as RefundRequestBody

  // ── 입력 기본값 정리 ───────────────────────────────────────────────────────
  const {
    nonce,
    idempotency_key,
    refund_method,
    account_info = null,
    coupon_discount = 0,
    point_discount = 0,
    shipping_fee = 0,
    total_line_amount = 0,
    reason = "refund",
  } = body

  // nonce 우선, 없으면 idempotency_key 를 nonce 대체값으로 사용 (spec I2)
  const rawNonce = nonce ?? idempotency_key
  if (!rawNonce) {
    res.status(400).json({ message: "nonce 또는 idempotency_key 는 필수입니다." })
    return
  }
  if (!refund_method) {
    res.status(400).json({ message: "refund_method 는 필수입니다." })
    return
  }

  // buildIdempotencyKey 로 spec I2 형식("{orderId}:refund:{nonce}") 정규 키 생성 (production 연결)
  const idempotencyKey = buildIdempotencyKey(orderId, rawNonce)

  const svc = req.scope.resolve(ORDER_OPS_KR_MODULE) as unknown as OrderOpsKrModuleService

  // ─── ① 멱등키 중복 확인 (spec C1 / UT-003) ────────────────────────────────
  //
  // 2026-07-28 수정(중요): 이전에는 expires_at 이 지난 키를 "새 요청"으로 통과시켰다.
  // 그 경로에서는 ④ 환불이 **한 번 더 실제 집행**된 뒤 ⑥ 저장이 유니크 제약으로 실패해
  // 호출자에게는 400 이 반환됐다(= 돈은 나갔는데 실패로 보이는 이중환불 경로).
  // 금전 처리이므로 fail-closed 로 바꾼다: 키가 존재하면 만료 여부와 무관하게 재집행하지 않는다.
  // (expires_at 은 이후 정리(cleanup) 용도로만 의미를 가진다)
  const existingIdem = await svc.findIdempotency(idempotencyKey)
  if (existingIdem) {
    const expired = new Date() >= new Date(existingIdem.expires_at)
    res.status(409).json({
      message: expired
        ? "이미 처리된 환불 요청입니다(멱등키 재사용). 새 환불은 새 nonce 로 요청하세요."
        : "중복 환불 요청입니다. 캐시 응답을 반환합니다.",
      cached: true,
      expired,
      ...existingIdem.cached_response,
    })
    return
  }

  // ─── ② 환불액 계산 ────────────────────────────────────────────────────────
  let refundAmount: number
  let reshippingResult

  if (body.items && body.items.length > 0 && total_line_amount > 0) {
    // 부분환불: calcProratedRefund 비례배분
    const proratedResult = calcProratedRefund({
      lines: body.items,
      couponDiscount: coupon_discount,
      pointDiscount: point_discount,
      shippingFee: shipping_fee,
      totalLineAmount: total_line_amount,
    })
    refundAmount = proratedResult.totalRefund

    // F7: 부분환불 후 잔여 금액 계산 → 재청구 배송비
    const refundedLineAmount = body.items.reduce((s, l) => s + l.amount, 0)
    const remainingOrderAmount = total_line_amount - refundedLineAmount
    reshippingResult = calcReshippingFee({ remainingOrderAmount })
  } else if (typeof body.amount === "number") {
    // 전액 또는 임의 금액 환불
    refundAmount = body.amount
    reshippingResult = calcReshippingFee({ remainingOrderAmount: 0 })
  } else {
    res.status(400).json({ message: "items 또는 amount 중 하나는 필수입니다." })
    return
  }

  // ─── ③ 음수·초과 검증 ────────────────────────────────────────────────────
  if (refundAmount <= 0) {
    res.status(400).json({ message: `환불액이 0 이하입니다: ${refundAmount}` })
    return
  }

  // ─── ④-pre: captured payment_id 조회 (Medusa v2 는 payment_id 필수) ────────
  let capturedPaymentId: string
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: orderData } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "payment_collections.payments.id",
        "payment_collections.payments.captured_at",
        "payment_collections.payments.amount",
        "payment_collections.payments.refunds.amount",
      ],
      filters: { id: orderId },
    })
    const order = orderData?.[0] as any
    const payments: Array<{ id: string; captured_at: string | null; amount: number; refunds?: Array<{ amount: number }> }> =
      order?.payment_collections?.flatMap((pc: any) => pc.payments ?? []) ?? []
    const captured = payments.filter((p) => p.captured_at != null)
    if (captured.length === 0) {
      res.status(422).json({ message: "환불 가능한(captured) 결제건이 없습니다." })
      return
    }
    // 보안점검 2026-07-28(P1-2): 환불 금액 상한 명시 — (결제액 − 기환불) 초과 거부(defense-in-depth).
    const capturedAmount = Number(captured[0].amount) || 0
    const alreadyRefunded = (captured[0].refunds ?? []).reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const remaining = capturedAmount - alreadyRefunded
    if (refundAmount > remaining) {
      res.status(400).json({
        message: `환불 가능액(${remaining}원)을 초과했습니다.`,
        refund_amount: refundAmount,
        refundable_remaining: remaining,
      })
      return
    }
    capturedPaymentId = captured[0].id
  } catch (e) {
    res.status(422).json({
      message: `결제 정보 조회에 실패했습니다: ${(e as Error).message}`,
    })
    return
  }

  // ─── ④ Medusa refundPaymentWorkflow 호출 (PG 환불, spec A1) ───────────────
  let workflowResult: any
  try {
    workflowResult = await (refundPaymentWorkflow as any)(req.scope).run({
      input: {
        payment_id: capturedPaymentId,
        amount: refundAmount,
      },
    })
  } catch (e) {
    // spec C2: PG 환불 실패 시 전체 롤백 + 보류 응답
    res.status(422).json({
      message: `PG 환불 처리에 실패했습니다: ${(e as Error).message}`,
      order_id: orderId,
      refund_amount: refundAmount,
      status: "pending",
    })
    return
  }

  // ─── ⑤ order_cancellation append-only 적재 ───────────────────────────────
  await svc.recordCancellation({
    order_id: orderId,
    refund_amount: refundAmount,
    refund_method: refund_method,
    account_info: account_info ?? null,
    // 보안점검 2026-07-27(A3): points↔coupon 필드 오매핑 수정
    restored_points: point_discount > 0 ? point_discount : 0,
    restored_coupon: coupon_discount > 0 ? coupon_discount : 0,
    reason,
  })

  // ─── ⑤-1 적립금·멤버십 역적립(A1) — 환불액 비례 회수. 실패해도 환불 흐름 불방해 ──
  await reverseOrderRewards(req.scope, {
    orderId,
    refundAmount, // 부분/전액 환불액 → 비례 역적립
    reasonKey: `refund-reversal:${rawNonce}`,
  }).catch(() => {})

  // ─── ⑥ 멱등키 캐시 저장 (24h) ────────────────────────────────────────────
  const responsePayload: Record<string, unknown> = {
    order_id: orderId,
    refund_amount: refundAmount,
    refund_method,
    status: "refunded",
    reshipping_fee: reshippingResult.reshippingFee,
    reshipping_required: reshippingResult.required,
  }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  // 이 시점엔 이미 환불이 집행됐다. 캐시 저장 실패로 호출자에게 실패를 반환하면
  // "돈은 나갔는데 실패" 로 보이므로, 저장 실패는 로그만 남기고 응답은 성공으로 유지한다.
  try {
    await svc.saveIdempotency(idempotencyKey, responsePayload, expiresAt)
  } catch (e) {
    console.warn(
      `[refund] 멱등키 저장 실패(key=${idempotencyKey}): ${(e as Error)?.message} — 환불 자체는 완료됨`
    )
  }

  // ─── 최종 응답 ────────────────────────────────────────────────────────────
  res.json(responsePayload)
}
