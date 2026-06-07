/**
 * 상품정보고시 Admin API
 *
 *  - GET  /admin/product-disclosure?product_id=<id>
 *      상품별 전체 버전 이력 조회(version DESC)
 *      product_id 미지정 시 400
 *
 *  - POST /admin/product-disclosure
 *      고시 초안 생성(draft 상태, version 자동 부여)
 *      Body: { product_id: string, type_template_id: string, fields_json: string }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_DISCLOSURE_MODULE } from "../../../modules/product-disclosure"
import ProductDisclosureModuleService from "../../../modules/product-disclosure/service"
import type { CreateDisclosureInput } from "../../../modules/product-disclosure/service"

/** GET /admin/product-disclosure?product_id=<id> */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_DISCLOSURE_MODULE) as unknown as ProductDisclosureModuleService
  const productId = req.query.product_id as string | undefined

  if (!productId?.trim()) {
    res.status(400).json({ message: "product_id 쿼리 파라미터가 필요합니다." })
    return
  }

  try {
    const disclosures = await svc.listByProduct(productId.trim())
    res.json({ disclosures, count: disclosures.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ message })
  }
}

/** POST /admin/product-disclosure — 초안 생성 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(PRODUCT_DISCLOSURE_MODULE) as unknown as ProductDisclosureModuleService
  const body = req.body as Partial<CreateDisclosureInput>

  if (!body?.product_id?.trim() || !body?.type_template_id?.trim() || !body?.fields_json?.trim()) {
    res.status(400).json({ message: "product_id, type_template_id, fields_json 이 모두 필요합니다." })
    return
  }

  try {
    const disclosure = await svc.createDraft({
      product_id: body.product_id.trim(),
      type_template_id: body.type_template_id.trim(),
      fields_json: body.fields_json.trim(),
    })
    res.status(201).json({ disclosure })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const status = message.includes("이미 작성 중인") ? 409 : 400
    res.status(status).json({ message })
  }
}
