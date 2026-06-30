/**
 * 고객 주문 요청(취소/반품/교환 신청) Store API
 *  - POST /store/orders/:id/request { type, reason, comment? }
 *    type: "cancel"(취소) | "return"(반품) | "exchange"(교환)
 *    → 주문 메모로 기록(관리자 노출) → 관리자가 강제취소/환불/RMA 로 처리.
 * 인증: 로그인 고객 본인 주문만(req.auth_context.actor_id === order.customer_id).
 * 가드레일: Medusa core 미수정. order-ops-kr 메모만 사용(고객은 직접 취소하지 않음 — 신청만).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_OPS_KR_MODULE } from "../../../../../modules/order-ops-kr"
import type OrderOpsKrModuleService from "../../../../../modules/order-ops-kr/service"

const TYPE_LABEL: Record<string, string> = {
  cancel: "취소",
  return: "반품",
  exchange: "교환",
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }

  const orderId = req.params.id
  const body = (req.body ?? {}) as { type?: string; reason?: string; comment?: string }
  const type = body.type ?? ""
  if (!TYPE_LABEL[type]) {
    res.status(400).json({ message: "type 은 cancel/return/exchange 중 하나여야 합니다." })
    return
  }
  if (!body.reason || !body.reason.trim()) {
    res.status(400).json({ message: "신청 사유는 필수입니다." })
    return
  }

  // 본인 주문 확인
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "display_id", "email"],
    filters: { id: orderId } as Record<string, unknown>,
  })
  const order = (data ?? [])[0] as any
  if (!order) {
    res.status(404).json({ message: "주문을 찾을 수 없습니다." })
    return
  }
  if (order.customer_id !== customerId) {
    res.status(403).json({ message: "본인 주문만 신청할 수 있습니다." })
    return
  }

  // 신청 내용을 주문 메모로 기록(관리자 노출). cancel 은 kind=cancel.
  const svc = req.scope.resolve(
    ORDER_OPS_KR_MODULE
  ) as unknown as OrderOpsKrModuleService
  const label = TYPE_LABEL[type]
  const content =
    `[고객 ${label} 신청] 사유: ${body.reason.trim()}` +
    (body.comment?.trim() ? ` / 상세: ${body.comment.trim()}` : "")

  await svc.addMemo(
    orderId,
    content,
    { id: customerId, email: order.email ?? null },
    type === "cancel" ? "cancel" : "memo"
  )

  res.status(201).json({ requested: true, type, order_id: orderId })
}
