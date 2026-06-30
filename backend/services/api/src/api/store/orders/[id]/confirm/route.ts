/**
 * 구매확정 Store API (배송완료 주문 수령 확인)
 *  - POST /store/orders/:id/confirm → 고객 구매확정 기록(관리자/정산 트리거 근거)
 * 인증: 로그인 고객 본인 주문만. 기록은 order-ops-kr 메모(kind=system).
 * ※ 적립/정산 트리거는 d7 이벤트 책임 — 본 라우트는 확정 사실만 기록.
 * 가드레일: Medusa core 미수정.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_OPS_KR_MODULE } from "../../../../../modules/order-ops-kr"
import type OrderOpsKrModuleService from "../../../../../modules/order-ops-kr/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id as string | undefined
  if (!customerId) {
    res.status(401).json({ message: "로그인이 필요합니다." })
    return
  }

  const orderId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "display_id", "email", "fulfillment_status"],
    filters: { id: orderId } as Record<string, unknown>,
  })
  const order = (data ?? [])[0] as any
  if (!order) {
    res.status(404).json({ message: "주문을 찾을 수 없습니다." })
    return
  }
  if (order.customer_id !== customerId) {
    res.status(403).json({ message: "본인 주문만 확정할 수 있습니다." })
    return
  }

  const svc = req.scope.resolve(
    ORDER_OPS_KR_MODULE
  ) as unknown as OrderOpsKrModuleService
  await svc.addMemo(
    orderId,
    "[고객 구매확정] 수령 확인 완료",
    { id: customerId, email: order.email ?? null },
    "system"
  )

  res.status(201).json({ confirmed: true, order_id: orderId })
}
