/**
 * 주문 관리자 메모 Admin API (한국형 GAP_B)
 *
 *  - GET  /admin/orders-kr/:id/memos     주문별 내부 메모 최신순
 *  - POST /admin/orders-kr/:id/memos     내부 메모 추가 ({ content })
 *
 * Medusa order 는 수정하지 않고 order-ops-kr 모듈에만 메모를 보관.
 * 권한검사/감사기록은 src/api/middlewares.ts (/admin/orders-kr → orders 메뉴).
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ORDER_OPS_KR_MODULE } from "../../../../../modules/order-ops-kr"
import OrderOpsKrModuleService from "../../../../../modules/order-ops-kr/service"

async function resolveActorEmail(req: MedusaRequest, actorId: string | null): Promise<string | null> {
  if (!actorId) return null
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({ entity: "user", fields: ["email"], filters: { id: actorId } })
    return data?.[0]?.email ?? null
  } catch {
    return null
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(ORDER_OPS_KR_MODULE) as unknown as OrderOpsKrModuleService
  const memos = await svc.listMemos(req.params.id)
  res.json({ memos, count: memos.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(ORDER_OPS_KR_MODULE) as unknown as OrderOpsKrModuleService
  const body = (req.body ?? {}) as { content?: string }
  if (!body.content || !body.content.trim()) {
    res.status(400).json({ message: "메모 내용(content)이 필요합니다." })
    return
  }
  if (body.content.trim().length > 2000) {
    res.status(400).json({ message: "메모 내용은 2000자를 초과할 수 없습니다." })
    return
  }
  const actorId = (req as any).auth_context?.actor_id ?? null
  const actorEmail = await resolveActorEmail(req, actorId)
  const memo = await svc.addMemo(req.params.id, body.content, { id: actorId, email: actorEmail }, "memo")
  res.json({ memo })
}
