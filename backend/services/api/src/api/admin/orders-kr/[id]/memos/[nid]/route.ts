/**
 * 주문 관리자 메모 단건 삭제 Admin API (한국형 GAP_B)
 *
 *  - DELETE /admin/orders-kr/:id/memos/:nid
 *
 * 권한 검증:
 *  - 본인(author_id == actorId) 또는 SUPER 등급만 삭제 가능.
 *  - 타인 요청 → 403. 메모 없음 → 404.
 *
 * spec: dag/d2_주문관리/t011_내부메모.md §8 C1
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ORDER_OPS_KR_MODULE } from "../../../../../../modules/order-ops-kr"
import OrderOpsKrModuleService from "../../../../../../modules/order-ops-kr/service"
import { RBAC_MODULE } from "../../../../../../modules/rbac"
import type RbacModuleService from "../../../../../../modules/rbac/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { nid } = req.params
  const actorId = (req as any).auth_context?.actor_id ?? null

  const svc = req.scope.resolve(ORDER_OPS_KR_MODULE) as unknown as OrderOpsKrModuleService

  // 메모 존재 확인
  const rows = await svc.listMemos(req.params.id)
  const memo = rows.find((m: any) => m.id === nid)
  if (!memo) {
    res.status(404).json({ message: "메모를 찾을 수 없습니다." })
    return
  }

  // 요청자 role 조회 (RBAC 모듈)
  let requesterRole: string | null = null
  if (actorId) {
    try {
      const rbac = req.scope.resolve(RBAC_MODULE) as unknown as RbacModuleService
      requesterRole = await rbac.getUserRole(actorId)
    } catch {
      requesterRole = null
    }
  }

  // 권한 검증: 본인 또는 SUPER만 삭제 가능
  const isSuper = requesterRole === "super"
  const isOwner = actorId && memo.author_id && memo.author_id === actorId
  if (!isSuper && !isOwner) {
    res.status(403).json({
      message: "본인이 작성한 메모 또는 SUPER 등급만 삭제할 수 있습니다.",
      code: "MEMO_DELETE_FORBIDDEN",
    })
    return
  }

  await svc.deleteMemo(nid)
  res.json({ deleted: true, id: nid })
}
