/**
 * 상품정보고시 단건 Admin API
 *
 *  - GET  /admin/product-disclosure/:id
 *      특정 고시 단건 조회 (모든 status)
 *
 *  - PATCH /admin/product-disclosure/:id
 *      초안(draft) 수정
 *      Body: { fields_json: string }
 *      published/archived 직접 수정은 서비스 레이어에서 차단
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_DISCLOSURE_MODULE } from "../../../../modules/product-disclosure"
import ProductDisclosureModuleService from "../../../../modules/product-disclosure/service"

/** GET /admin/product-disclosure/:id */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_DISCLOSURE_MODULE) as unknown as ProductDisclosureModuleService
  const id = req.params.id

  try {
    const records = await svc.listProductDisclosures({ id })
    if (!records.length) {
      res.status(404).json({ message: `고시 문서를 찾을 수 없습니다. id=${id}` })
      return
    }
    res.json({ disclosure: records[0] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}

/** PATCH /admin/product-disclosure/:id — draft 수정 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_DISCLOSURE_MODULE) as unknown as ProductDisclosureModuleService
  const id = req.params.id
  const body = req.body as { fields_json?: string }

  if (!body?.fields_json?.trim()) {
    res.status(400).json({ message: "fields_json 이 필요합니다." })
    return
  }

  try {
    const disclosure = await svc.updateDraft(id, body.fields_json.trim())
    res.json({ disclosure })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message.includes("찾을 수 없습니다") ? 404 : 400
    res.status(status).json({ message })
  }
}
