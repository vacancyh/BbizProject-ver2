/**
 * 비회원 주문조회 Store API
 *  - POST /store/orders/lookup { display_id, email } → 주문번호+이메일 일치 시 주문 요약 반환
 * 보안: display_id 와 email 이 모두 일치해야 조회 가능(열거 방지). 미일치 시 404.
 * 가드레일: Medusa core 미수정(표준 order 엔티티 조회만).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { display_id?: number | string; email?: string }
  const displayId = Number(body.display_id)
  const email = (body.email ?? "").trim().toLowerCase()

  if (!displayId || !email) {
    res.status(400).json({ message: "주문번호와 이메일을 입력해 주세요." })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "total",
      "currency_code",
      "status",
      "created_at",
    ],
    filters: { display_id: displayId } as Record<string, unknown>,
  })

  const order = (data ?? []).find(
    (o: any) => (o.email ?? "").trim().toLowerCase() === email
  )

  if (!order) {
    res.status(404).json({ message: "일치하는 주문이 없습니다. 주문번호와 이메일을 확인해 주세요." })
    return
  }

  res.json({
    order: {
      id: order.id,
      display_id: order.display_id,
      total: order.total,
      currency_code: order.currency_code,
      status: order.status,
      created_at:
        order.created_at instanceof Date
          ? order.created_at.toISOString()
          : String(order.created_at),
    },
  })
}
