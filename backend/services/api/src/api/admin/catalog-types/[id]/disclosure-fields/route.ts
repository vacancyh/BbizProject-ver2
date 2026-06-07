/**
 * 상품유형 고시 필수항목 추가 Admin API
 *  - POST /admin/product-types/:id/disclosure-fields  { field_key, label, required?, input_type?, sort_order? }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_TYPE_MODULE } from "../../../../../modules/product-type"
import ProductTypeModuleService from "../../../../../modules/product-type/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_TYPE_MODULE) as unknown as ProductTypeModuleService
  const body = (req.body ?? {}) as {
    field_key?: string
    label?: string
    required?: boolean
    input_type?: string
    sort_order?: number
  }
  if (!body.field_key?.trim() || !body.label?.trim()) {
    res.status(400).json({ message: "field_key 와 label 이 필요합니다." })
    return
  }
  const created = await service.createProductTypeDisclosureFields([
    {
      type_template_id: req.params.id,
      field_key: body.field_key.trim(),
      label: body.label.trim(),
      required: body.required ?? true,
      input_type: body.input_type ?? "text",
      sort_order: body.sort_order ?? 0,
    },
  ])
  res.status(201).json({ field: Array.isArray(created) ? created[0] : created })
}
