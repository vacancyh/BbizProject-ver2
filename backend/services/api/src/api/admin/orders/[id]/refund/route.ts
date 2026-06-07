/**
 * 주문 환불 Admin API (한국형 커스텀 — Medusa core 미제공)
 *
 *  POST /admin/orders/:id/refund
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
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_OPS_KR_MODULE } from "../../../../../modules/order-ops-kr"
import OrderOpsKrModuleService from "../../../../../modules/order-ops-kr/service"
import {
  calcProratedRefund,
  calcReshippingFee,
} from "./refund-logic"
import { buildIdempotencyKey } from "./idempotency-logic"

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

export async function POST(req: MedusaRequest, res: MedusaResponse) {
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
  const existingIdem = await svc.findIdempotency(idempotencyKey)
  if (existingIdem) {
    // 만료 여부 확인
    const now = new Date()
    const expiresAt = new Date(existingIdem.expires_at)
    if (now < expiresAt) {
      // 캐시 응답 그대로 409 반환
      res.status(409).json({
        message: "중복 환불 요청입니다. 캐시 응답을 반환합니다.",
        cached: true,
        ...existingIdem.cached_response,
      })
      return
    }
    // 만료된 키는 새 요청으로 처리 (통과)
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
      ],
      filters: { id: orderId },
    })
    const order = orderData?.[0] as any
    const payments: Array<{ id: string; captured_at: string | null; amount: number }> =
      order?.payment_collections?.flatMap((pc: any) => pc.payments ?? []) ?? []
    const captured = payments.filter((p) => p.captured_at != null)
    if (captured.length === 0) {
      res.status(422).json({ message: "환불 가능한(captured) 결제건이 없습니다." })
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
    restored_points: coupon_discount > 0 ? coupon_discount : 0,
    restored_coupon: point_discount > 0 ? point_discount : 0,
    reason,
  })

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
  await svc.saveIdempotency(idempotencyKey, responsePayload, expiresAt)

  // ─── 최종 응답 ────────────────────────────────────────────────────────────
  res.json(responsePayload)
}
