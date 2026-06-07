/**
 * 상품정보고시 게시 Admin API
 *
 *  - POST /admin/product-disclosure/:id/publish
 *      draft → published 상태 전이.
 *      기존 published 버전 자동 archived 처리.
 *      반환: { disclosure, previousPublishedId }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_DISCLOSURE_MODULE } from "../../../../../modules/product-disclosure"
import ProductDisclosureModuleService from "../../../../../modules/product-disclosure/service"

/** POST /admin/product-disclosure/:id/publish */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_DISCLOSURE_MODULE) as unknown as ProductDisclosureModuleService
  const id = req.params.id

  // 게시 처리자: 인증 미들웨어에서 주입된 actor_id
  const actorId: string = (req as any).auth_context?.actor_id ?? "anonymous"

  try {
    const result = await svc.publishDisclosure(id, actorId)
    res.json({
      disclosure: result.disclosure,
      previous_published_id: result.previousPublishedId,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message.includes("찾을 수 없습니다") ? 404 : 400
    res.status(status).json({ message })
  }
}
