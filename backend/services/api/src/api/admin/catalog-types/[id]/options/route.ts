/**
 * 상품유형 옵션 템플릿 추가 Admin API
 *  - POST /admin/product-types/:id/options   { option_title, option_values: string[], rank? }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_TYPE_MODULE } from "../../../../../modules/product-type"
import ProductTypeModuleService from "../../../../../modules/product-type/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_TYPE_MODULE) as unknown as ProductTypeModuleService
  const body = (req.body ?? {}) as { option_title?: string; option_values?: string[]; rank?: number }
  if (!body.option_title?.trim() || !Array.isArray(body.option_values) || !body.option_values.length) {
    res.status(400).json({ message: "option_title 과 option_values(배열)가 필요합니다." })
    return
  }
  const created = await service.createProductTypeOptionTemplates([
    {
      type_template_id: req.params.id,
      option_title: body.option_title.trim(),
      option_values: body.option_values as unknown as Record<string, unknown>,
      rank: body.rank ?? 0,
    },
  ])
  res.status(201).json({ option: Array.isArray(created) ? created[0] : created })
}
