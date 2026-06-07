/**
 * 카테고리 ↔ 옵션템플릿 매핑 개별 관리 Admin API
 *
 *  - DELETE /admin/category-option-map/:id
 *      매핑 레코드 1건 삭제.
 *
 *  - PATCH  /admin/category-option-map/:id
 *      sort_order 수정. Body: { sort_order: number }
 */
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CATEGORY_OPTION_MAP_MODULE } from "../../../../modules/category-option-map"
import CategoryOptionMapModuleService from "../../../../modules/category-option-map/service"

/** DELETE /admin/category-option-map/:id */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const mapService = req.scope.resolve(CATEGORY_OPTION_MAP_MODULE) as unknown as CategoryOptionMapModuleService
  const id = req.params.id

  await mapService.deleteCategoryOptionMaps(id)
  res.json({ id, deleted: true })
}

/** PATCH /admin/category-option-map/:id — sort_order 변경 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const mapService = req.scope.resolve(CATEGORY_OPTION_MAP_MODULE) as unknown as CategoryOptionMapModuleService
  const id = req.params.id
  const body = req.body as { sort_order?: number }

  if (typeof body?.sort_order !== "number") {
    res.status(400).json({ message: "sort_order(숫자) 가 필요합니다." })
    return
  }

  const updated = await mapService.updateCategoryOptionMaps({ id }, { sort_order: body.sort_order })
  const map = Array.isArray(updated) ? updated[0] : updated
  res.json({ category_option_map: map })
}
