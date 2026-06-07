/**
 * 상품유형(분야/분류) 개별 관리 Admin API
 *
 *  - DELETE /admin/product-types/:id
 *      해당 유형 + 소속 옵션 템플릿 + 고시 필드를 함께 삭제(분야 삭제 시 하위 분류는 보존 — 분류부터 삭제 권장).
 *
 * 메두사 코어 미수정. 한국형 product-type 모듈만 사용.
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_TYPE_MODULE } from "../../../../modules/product-type"
import ProductTypeModuleService from "../../../../modules/product-type/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(PRODUCT_TYPE_MODULE) as unknown as ProductTypeModuleService
  const id = req.params.id

  // 소속 옵션/고시 먼저 삭제
  const opts = await service.listProductTypeOptionTemplates({ type_template_id: id })
  if (opts.length) await service.deleteProductTypeOptionTemplates(opts.map((o: any) => o.id))
  const fields = await service.listProductTypeDisclosureFields({ type_template_id: id })
  if (fields.length) await service.deleteProductTypeDisclosureFields(fields.map((f: any) => f.id))

  await service.deleteProductTypeTemplates(id)
  res.json({ id, deleted: true })
}
